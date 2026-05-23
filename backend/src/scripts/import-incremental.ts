import { access, appendFile, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { receitaPool } from "../lib/receitaDb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_DATA_DIR = "/Users/cris/Downloads/2026-05";
const PROJECT_STATE_PATH = path.resolve(BACKEND_ROOT, "../../PROJECT_STATE.md");

const MAX_IMPORT_MS = Number(process.env.IMPORT_MAX_MS ?? 3_600_000);
const MIN_FREE_GB = Number(process.env.IMPORT_MIN_FREE_GB ?? 15);

type CoverageSnapshot = {
  percent: { STRONG: number; PARTIAL: number; CADASTRAL: number };
  totals: {
    total_estabelecimentos: number;
    total_socios: number;
    cnpjs_completos: number;
  };
};

type ImportJob = {
  kind: "estabelecimentos" | "socios";
  partition: number;
  fileName: string;
};

async function main() {
  const dataDir = process.argv.find((arg) => arg.startsWith("--dir="))?.split("=")[1] ?? DEFAULT_DATA_DIR;
  const onlyEstab = process.argv.includes("--only-estabelecimentos");
  const onlySocios = process.argv.includes("--only-socios");
  const fromPart = Number(process.argv.find((arg) => arg.startsWith("--from="))?.split("=")[1] ?? 1);
  const toPart = Number(process.argv.find((arg) => arg.startsWith("--to="))?.split("=")[1] ?? 9);

  await assertPostgresAvailable();
  await assertDiskSpace();

  const jobs = buildJobs(dataDir, fromPart, toPart, onlyEstab, onlySocios);
  if (jobs.length === 0) {
    console.log("Nenhum job de importação configurado.");
    return;
  }

  console.log(`Diretório de dados: ${dataDir}`);
  console.log(`Jobs: ${jobs.length} | timeout por ZIP: ${Math.round(MAX_IMPORT_MS / 60000)} min`);

  const beforeAll = await loadCoverageSnapshot();
  await appendProjectStateHeader(dataDir, beforeAll);

  for (const job of jobs) {
    const zipPath = path.join(dataDir, job.fileName);
    try {
      await access(zipPath);
    } catch {
      const message = `ZIP ausente: ${zipPath}`;
      console.warn(message);
      await appendProjectStateBlock({
        file: job.fileName,
        status: "bloqueado",
        reason: message,
        before: await loadCoverageSnapshot(),
        after: await loadCoverageSnapshot(),
      });
      continue;
    }

    const before = await loadCoverageSnapshot();
    console.log(`\n>>> Importando ${job.fileName} (${job.kind})...`);

    try {
      await runImport(job.kind, zipPath);
      await runCoverageReport();
      const after = await loadCoverageSnapshot();
      await appendProjectStateBlock({
        file: job.fileName,
        status: "ok",
        before,
        after,
      });
      console.log(
        `STRONG ${before.percent.STRONG}% → ${after.percent.STRONG}% (${formatDelta(before.percent.STRONG, after.percent.STRONG)})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Falha em ${job.fileName}:`, message);
      await appendProjectStateBlock({
        file: job.fileName,
        status: "bloqueado",
        reason: message,
        before,
        after: await loadCoverageSnapshot(),
      });
    }
  }

  const afterAll = await loadCoverageSnapshot();
  console.log("\n=== Evolução total ===");
  console.log(
    `STRONG ${beforeAll.percent.STRONG}% → ${afterAll.percent.STRONG}% (${formatDelta(beforeAll.percent.STRONG, afterAll.percent.STRONG)})`,
  );
  console.log(
    `Estabelecimentos ${beforeAll.totals.total_estabelecimentos.toLocaleString("pt-BR")} → ${afterAll.totals.total_estabelecimentos.toLocaleString("pt-BR")}`,
  );
  console.log(
    `Sócios ${beforeAll.totals.total_socios.toLocaleString("pt-BR")} → ${afterAll.totals.total_socios.toLocaleString("pt-BR")}`,
  );
}

function buildJobs(
  dataDir: string,
  from: number,
  to: number,
  onlyEstab: boolean,
  onlySocios: boolean,
): ImportJob[] {
  const jobs: ImportJob[] = [];
  const runEstab = !onlySocios;
  const runSocios = !onlyEstab;

  if (runEstab) {
    for (let i = from; i <= to; i++) {
      jobs.push({
        kind: "estabelecimentos",
        partition: i,
        fileName: `Estabelecimentos${i}.zip`,
      });
    }
  }

  if (runSocios) {
    for (let i = from; i <= to; i++) {
      jobs.push({
        kind: "socios",
        partition: i,
        fileName: `Socios${i}.zip`,
      });
    }
  }

  return jobs;
}

async function assertPostgresAvailable(): Promise<void> {
  try {
    await receitaPool.query("SELECT 1");
  } catch (error) {
    throw new Error(
      `PostgreSQL indisponível. Rode: cd backend && npm run db:up. ${error instanceof Error ? error.message : error}`,
    );
  } finally {
    await receitaPool.end();
  }
}

async function assertDiskSpace(): Promise<void> {
  const df = await runCommand("df", ["-g", BACKEND_ROOT]);
  const lines = df.stdout.trim().split("\n");
  if (lines.length < 2) return;

  const parts = lines[1].split(/\s+/);
  const availGb = Number(parts[3]);
  if (Number.isFinite(availGb) && availGb < MIN_FREE_GB) {
    throw new Error(`Espaço insuficiente: ${availGb}GB livres (mínimo ${MIN_FREE_GB}GB).`);
  }
}

async function runImport(kind: ImportJob["kind"], zipPath: string): Promise<void> {
  const script = kind === "estabelecimentos" ? "import:estabelecimentos" : "import:socios";
  const result = await runCommand("npm", ["run", script, "--", zipPath], {
    cwd: BACKEND_ROOT,
    timeoutMs: MAX_IMPORT_MS,
  });

  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || `Importação falhou com código ${result.code}`);
  }
}

async function runCoverageReport(): Promise<void> {
  const result = await runCommand("npm", ["run", "coverage:report"], {
    cwd: BACKEND_ROOT,
    timeoutMs: 600_000,
  });

  if (result.code !== 0) {
    throw new Error(result.stderr || "coverage:report falhou");
  }
}

async function loadCoverageSnapshot(): Promise<CoverageSnapshot> {
  const reportPath = path.join(BACKEND_ROOT, "reports/coverage-report.json");
  const raw = await readFile(reportPath, "utf8");
  const data = JSON.parse(raw) as {
    investigation_status: { percent: CoverageSnapshot["percent"] };
    totals: CoverageSnapshot["totals"];
  };

  return {
    percent: data.investigation_status.percent,
    totals: {
      total_estabelecimentos: data.totals.total_estabelecimentos,
      total_socios: data.totals.total_socios,
      cnpjs_completos: data.totals.cnpjs_completos,
    },
  };
}

async function appendProjectStateHeader(dataDir: string, before: CoverageSnapshot): Promise<void> {
  const block = [
    "",
    "### Importação incremental Receita — lote em andamento",
    "",
    `- Data: ${new Date().toISOString().slice(0, 10)}`,
    `- Diretório: \`${dataDir}\``,
    `- Baseline STRONG: ${before.percent.STRONG}% | PARTIAL: ${before.percent.PARTIAL}% | CADASTRAL: ${before.percent.CADASTRAL}%`,
    `- Estabelecimentos: ${before.totals.total_estabelecimentos.toLocaleString("pt-BR")} | Sócios: ${before.totals.total_socios.toLocaleString("pt-BR")}`,
    "",
  ].join("\n");

  await appendFile(PROJECT_STATE_PATH, block, "utf8");
}

async function appendProjectStateBlock(input: {
  file: string;
  status: "ok" | "bloqueado";
  reason?: string;
  before: CoverageSnapshot;
  after: CoverageSnapshot;
}): Promise<void> {
  const lines = [
    `#### Importação: ${input.file}`,
    "",
    `Status: ${input.status}`,
  ];

  if (input.reason) {
    lines.push(`Motivo: ${input.reason}`);
  }

  lines.push(
    "",
    "Antes:",
    `- STRONG: ${input.before.percent.STRONG}%`,
    `- PARTIAL: ${input.before.percent.PARTIAL}%`,
    `- CADASTRAL: ${input.before.percent.CADASTRAL}%`,
    `- estabelecimentos: ${input.before.totals.total_estabelecimentos.toLocaleString("pt-BR")}`,
    `- socios: ${input.before.totals.total_socios.toLocaleString("pt-BR")}`,
    "",
    "Depois:",
    `- STRONG: ${input.after.percent.STRONG}%`,
    `- PARTIAL: ${input.after.percent.PARTIAL}%`,
    `- CADASTRAL: ${input.after.percent.CADASTRAL}%`,
    `- estabelecimentos: ${input.after.totals.total_estabelecimentos.toLocaleString("pt-BR")}`,
    `- socios: ${input.after.totals.total_socios.toLocaleString("pt-BR")}`,
    "",
    "Diferença:",
    `- STRONG: ${formatDelta(input.before.percent.STRONG, input.after.percent.STRONG)}`,
    `- PARTIAL: ${formatDelta(input.before.percent.PARTIAL, input.after.percent.PARTIAL)}`,
    `- CADASTRAL: ${formatDelta(input.before.percent.CADASTRAL, input.after.percent.CADASTRAL)}`,
    "",
  );

  await appendFile(PROJECT_STATE_PATH, `${lines.join("\n")}\n`, "utf8");
}

function formatDelta(before: number, after: number): string {
  const delta = roundPct(after - before);
  return delta >= 0 ? `+${delta}%` : `${delta}%`;
}

function roundPct(value: number): number {
  return Math.round(value * 100) / 100;
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {},
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer =
      options.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
          }, options.timeoutMs)
        : null;

    child.stdout?.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr?.on("data", (chunk) => {
      const text = String(chunk);
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`Tempo excessivo (> ${options.timeoutMs}ms) em ${command} ${args.join(" ")}`));
        return;
      }
      resolve({ code, stdout, stderr });
    });
  });
}

main().catch((error) => {
  console.error("Importação incremental abortada:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

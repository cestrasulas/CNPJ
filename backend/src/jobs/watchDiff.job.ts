import { receitaPool } from "../lib/receitaDb.js";
import { runWatchDiffJob } from "../services/watchDiff.service.js";

function parseArgs(argv: string[]) {
  let cnpjBasico: string | undefined;
  let limit = 20;

  for (const arg of argv) {
    if (arg.startsWith("--cnpj=")) {
      cnpjBasico = arg.slice("--cnpj=".length).trim();
    }
    if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
    }
  }

  if (cnpjBasico && !/^\d{8}$/.test(cnpjBasico)) {
    throw new Error("Parâmetro --cnpj deve conter 8 dígitos (CNPJ básico).");
  }

  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("Parâmetro --limit deve ser um número positivo.");
  }

  return { cnpjBasico, limit };
}

async function main() {
  const { cnpjBasico, limit } = parseArgs(process.argv.slice(2));
  const results = await runWatchDiffJob({ cnpjBasico, limit });

  if (results.length === 0) {
    console.log(
      cnpjBasico
        ? `Nenhum watch encontrado para CNPJ ${cnpjBasico}. Crie um via POST /api/watch.`
        : "Nenhum watch cadastrado.",
    );
    return;
  }

  for (const result of results) {
    const title = result.label ?? result.cnpjBasico;
    console.log(`\n=== ${title} (${result.cnpjBasico}) ===`);
    if (result.baseline) {
      console.log("Baseline registrada.");
    } else if (result.events.length === 0) {
      console.log("Nenhuma mudança detectada em sócios/contatos.");
    } else {
      for (const event of result.events) {
        console.log(`- [${event.category}/${event.changeType}] ${event.description}`);
      }
    }
  }
}

main()
  .catch((error) => {
    console.error("Erro ao executar watch diff:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await receitaPool.end();
  });

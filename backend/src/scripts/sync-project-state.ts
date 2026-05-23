import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const REPO_STATE = path.join(REPO_ROOT, "PROJECT_STATE.md");
const LEGACY_STATE =
  process.env.IMPORT_STATE_LEGACY_PATH ?? path.join(process.env.HOME ?? "", "PROJECT_STATE.md");

function extractImportBlocks(content: string): Array<{ key: string; text: string }> {
  const lines = content.split("\n");
  const blocks: Array<{ key: string; text: string }> = [];
  let current: string[] | null = null;
  let key = "";

  for (const line of lines) {
    if (line.startsWith("#### Importação: ")) {
      if (current && key) {
        blocks.push({ key, text: `${current.join("\n")}\n` });
      }
      key = line.replace("#### Importação: ", "").trim();
      current = [line];
      continue;
    }
    if (current) {
      if (line.startsWith("### ") && !line.startsWith("#### ")) {
        blocks.push({ key, text: `${current.join("\n")}\n` });
        current = null;
        key = "";
        continue;
      }
      current.push(line);
    }
  }

  if (current && key) {
    blocks.push({ key, text: `${current.join("\n")}\n` });
  }

  return blocks;
}

async function main() {
  let legacyRaw: string;
  try {
    legacyRaw = await readFile(LEGACY_STATE, "utf8");
  } catch {
    console.log(`Nada a sincronizar (${LEGACY_STATE} ausente).`);
    return;
  }

  const repoRaw = await readFile(REPO_STATE, "utf8");
  const legacyBlocks = extractImportBlocks(legacyRaw);
  const missing = legacyBlocks.filter((block) => !repoRaw.includes(`#### Importação: ${block.key}`));

  if (missing.length === 0) {
    console.log("PROJECT_STATE.md do repo já contém todos os blocos do arquivo legado.");
    return;
  }

  const payload = `\n${missing.map((b) => b.text).join("\n")}`;
  await appendFile(REPO_STATE, payload, "utf8");
  console.log(`Sincronizados ${missing.length} bloco(s) de ${LEGACY_STATE} → ${REPO_STATE}`);
  for (const block of missing) {
    console.log(`  - ${block.key}`);
  }
}

main().catch((error) => {
  console.error("sync-project-state falhou:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

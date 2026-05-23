import { readFile } from "node:fs/promises";
import { receitaPool } from "./lib/receitaDb.js";

const migrationPath = new URL("../migrations/005_investigation_watch_diff.sql", import.meta.url);

async function main() {
  const sql = await readFile(migrationPath, "utf8");
  await receitaPool.query(sql);
  await receitaPool.end();
  console.log("Migration investigation watch diff aplicada com sucesso.");
}

main().catch(async (error) => {
  console.error("Erro ao aplicar migration investigation watch diff:", error);
  await receitaPool.end();
  process.exitCode = 1;
});

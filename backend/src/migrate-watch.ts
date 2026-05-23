import { readFile } from "node:fs/promises";
import { receitaPool } from "./lib/receitaDb.js";

const migrationPath = new URL("../migrations/004_investigation_watch.sql", import.meta.url);

async function main() {
  const sql = await readFile(migrationPath, "utf8");
  await receitaPool.query(sql);
  await receitaPool.end();
  console.log("Migration investigation watch aplicada com sucesso.");
}

main().catch(async (error) => {
  console.error("Erro ao aplicar migration investigation watch:", error);
  await receitaPool.end();
  process.exitCode = 1;
});

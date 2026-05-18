import "dotenv/config";
import { Pool } from "pg";

const connectionString =
  process.env.RECEITA_DATABASE_URL || "postgres://cnpj:cnpj@127.0.0.1:5433/cnpj_receita";

export const receitaPool = new Pool({ connectionString });

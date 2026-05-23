import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { casesRoutes } from "./routes/cases.routes.js";
import { companiesRoutes } from "./routes/companies.routes.js";
import { investigationRoutes } from "./routes/investigation.routes.js";
import { receitaRoutes } from "./routes/receita.routes.js";
import { searchRoutes } from "./routes/search.routes.js";

const app = Fastify({
  logger: true,
});

const allowedOrigins = [
  env.FRONTEND_ORIGIN,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

await app.register(cors, {
  origin: allowedOrigins,
});

app.get("/health", async () => ({
  ok: true,
  service: "cnpj-intelligence-backend",
  authDisabled: env.AUTH_DISABLED,
}));

await app.register(companiesRoutes);
await app.register(casesRoutes);
await app.register(receitaRoutes);
await app.register(investigationRoutes);
await app.register(searchRoutes);

await app.listen({
  port: env.PORT,
  host: "0.0.0.0",
});

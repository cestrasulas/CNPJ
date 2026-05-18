import type { FastifyInstance } from "fastify";
import { lookupCompanyByCnpj } from "../services/cnpjLookup.service.js";
import { getCompanyRelations } from "../services/relationship.service.js";
import { isValidCnpj, onlyDigits } from "../utils/cnpj.js";

export async function companiesRoutes(app: FastifyInstance) {
  app.get("/api/companies/:cnpj/relations", async (request, reply) => {
    const params = request.params as { cnpj: string };
    const cnpj = onlyDigits(params.cnpj);

    if (!isValidCnpj(cnpj)) {
      return reply.status(400).send({
        error: "CNPJ inválido",
        message: "Informe um CNPJ com 14 dígitos válidos.",
      });
    }

    try {
      const result = await getCompanyRelations(cnpj);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);

      return reply.status(502).send({
        error: "Falha ao consultar relações",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/companies/:cnpj", async (request, reply) => {
    const params = request.params as { cnpj: string };
    const cnpj = onlyDigits(params.cnpj);

    if (!isValidCnpj(cnpj)) {
      return reply.status(400).send({
        error: "CNPJ inválido",
        message: "Informe um CNPJ com 14 dígitos válidos.",
      });
    }

    try {
      const result = await lookupCompanyByCnpj(cnpj);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);

      return reply.status(502).send({
        error: "Falha ao consultar CNPJ",
        message: formatErrorMessage(error),
      });
    }
  });
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Erro desconhecido";
  }
}

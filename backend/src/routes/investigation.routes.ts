import type { FastifyInstance } from "fastify";
import {
  buildInvestigationDossierHtml,
  buildInvestigationReport,
  getInvestigationAvailability,
} from "../services/investigation.service.js";

export async function investigationRoutes(app: FastifyInstance) {
  app.get("/api/investigation/company/:cnpjBasico", async (request, reply) => {
    const params = request.params as { cnpjBasico: string };
    const cnpjBasico = params.cnpjBasico.replace(/\D/g, "");

    if (cnpjBasico.length !== 8) {
      return reply.status(400).send({
        error: "CNPJ básico inválido",
        message: "Informe um CNPJ básico com 8 dígitos.",
      });
    }

    try {
      const report = await buildInvestigationReport(cnpjBasico);
      return reply.send(report);
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao gerar investigação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.get("/api/investigation/company/:cnpjBasico/availability", async (request, reply) => {
    const params = request.params as { cnpjBasico: string };
    const cnpjBasico = params.cnpjBasico.replace(/\D/g, "");

    if (cnpjBasico.length !== 8) {
      return reply.status(400).send({
        error: "CNPJ básico inválido",
        message: "Informe um CNPJ básico com 8 dígitos.",
      });
    }

    try {
      const availability = await getInvestigationAvailability(cnpjBasico);
      return reply.send(availability);
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao verificar disponibilidade de investigação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.get("/api/investigation/company/:cnpjBasico/dossier.html", async (request, reply) => {
    const params = request.params as { cnpjBasico: string };
    const cnpjBasico = params.cnpjBasico.replace(/\D/g, "");

    if (cnpjBasico.length !== 8) {
      return reply.status(400).send({
        error: "CNPJ básico inválido",
        message: "Informe um CNPJ básico com 8 dígitos.",
      });
    }

    try {
      const html = await buildInvestigationDossierHtml(cnpjBasico);
      return reply.type("text/html; charset=utf-8").send(html);
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao gerar dossiê",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { addCaseEntity, createCase, getCaseById, listCases } from "../services/case.service.js";

const caseStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]);

const createCaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  status: caseStatusSchema.optional(),
});

const addEntitySchema = z.object({
  entityType: z.string().trim().min(1).max(50),
  entityValue: z.string().trim().min(1).max(200),
  entityLabel: z.string().trim().max(300).optional().nullable(),
});

export async function casesRoutes(app: FastifyInstance) {
  app.post("/api/cases", async (request, reply) => {
    const parsed = createCaseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Payload inválido",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
    }

    try {
      const created = await createCase(parsed.data);
      return reply.status(201).send(created);
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao criar caso",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/cases", async (request, reply) => {
    try {
      const cases = await listCases();
      return reply.send({ data: cases });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao listar casos",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/cases/:id", async (request, reply) => {
    const params = request.params as { id: string };

    try {
      const investigationCase = await getCaseById(params.id);
      if (!investigationCase) {
        return reply.status(404).send({
          error: "Caso não encontrado",
          message: "Nenhum caso de investigação encontrado com este id.",
        });
      }

      return reply.send(investigationCase);
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao buscar caso",
        message: formatErrorMessage(error),
      });
    }
  });

  app.post("/api/cases/:id/entities", async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = addEntitySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Payload inválido",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
    }

    try {
      const entity = await addCaseEntity({
        caseId: params.id,
        entityType: parsed.data.entityType,
        entityValue: parsed.data.entityValue,
        entityLabel: parsed.data.entityLabel,
      });
      return reply.status(201).send(entity);
    } catch (error) {
      if (error instanceof Error && error.message === "CASE_NOT_FOUND") {
        return reply.status(404).send({
          error: "Caso não encontrado",
          message: "Nenhum caso de investigação encontrado com este id.",
        });
      }

      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao adicionar entidade ao caso",
        message: formatErrorMessage(error),
      });
    }
  });
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erro desconhecido";
}

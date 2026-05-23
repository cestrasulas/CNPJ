import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  createWatch,
  deleteWatch,
  getWatchById,
  listWatchEvents,
  listWatches,
  updateWatch,
} from "../services/watch.service.js";

const cnpjBasicoSchema = z.string().trim().regex(/^\d{8}$/, "cnpjBasico deve ter 8 dígitos");

const createWatchSchema = z.object({
  cnpjBasico: cnpjBasicoSchema,
  label: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const updateWatchSchema = z.object({
  label: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  lastCheckedAt: z.string().datetime().optional().nullable(),
});

export async function watchRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.post("/api/watch", async (request, reply) => {
    const parsed = createWatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Payload inválido",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
    }

    try {
      const created = await createWatch(parsed.data);
      return reply.status(201).send(created);
    } catch (error) {
      if (error instanceof Error && error.message === "WATCH_ALREADY_EXISTS") {
        return reply.status(409).send({
          error: "Empresa já observada",
          message: "Já existe um watch para este CNPJ básico.",
        });
      }

      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao criar watch",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/watch", async (request, reply) => {
    try {
      const watches = await listWatches();
      return reply.send({ data: watches });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao listar watches",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/watch/:id", async (request, reply) => {
    const params = request.params as { id: string };

    try {
      const watch = await getWatchById(params.id);
      if (!watch) {
        return reply.status(404).send({
          error: "Watch não encontrado",
          message: "Nenhuma empresa observada encontrada com este id.",
        });
      }

      return reply.send(watch);
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao buscar watch",
        message: formatErrorMessage(error),
      });
    }
  });

  app.get("/api/watch/:id/events", async (request, reply) => {
    const params = request.params as { id: string };
    const query = request.query as { limit?: string };
    const limit = query.limit ? Number(query.limit) : 10;

    if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
      return reply.status(400).send({
        error: "Parâmetro inválido",
        message: "limit deve ser um número entre 1 e 50.",
      });
    }

    try {
      const events = await listWatchEvents(params.id, limit);
      return reply.send({ data: events });
    } catch (error) {
      if (error instanceof Error && error.message === "WATCH_NOT_FOUND") {
        return reply.status(404).send({
          error: "Watch não encontrado",
          message: "Nenhuma empresa observada encontrada com este id.",
        });
      }

      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao listar eventos do watch",
        message: formatErrorMessage(error),
      });
    }
  });

  app.patch("/api/watch/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = updateWatchSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Payload inválido",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
    }

    try {
      const updated = await updateWatch(params.id, parsed.data);
      if (!updated) {
        return reply.status(404).send({
          error: "Watch não encontrado",
          message: "Nenhuma empresa observada encontrada com este id.",
        });
      }

      return reply.send(updated);
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao atualizar watch",
        message: formatErrorMessage(error),
      });
    }
  });

  app.delete("/api/watch/:id", async (request, reply) => {
    const params = request.params as { id: string };

    try {
      const deleted = await deleteWatch(params.id);
      if (!deleted) {
        return reply.status(404).send({
          error: "Watch não encontrado",
          message: "Nenhuma empresa observada encontrada com este id.",
        });
      }

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha ao remover watch",
        message: formatErrorMessage(error),
      });
    }
  });
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erro desconhecido";
}

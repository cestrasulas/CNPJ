import type { FastifyInstance } from "fastify";
import { unifiedSearch, type SearchQueryType } from "../services/search.service.js";

const ALLOWED_TYPES = new Set<SearchQueryType>([
  "auto",
  "cnpj",
  "company",
  "partner",
  "address",
  "phone",
  "email",
]);

export async function searchRoutes(app: FastifyInstance) {
  app.get("/api/search", async (request, reply) => {
    const query = request.query as { q?: string; type?: string; limit?: string };
    const q = query.q?.trim() ?? "";
    const type = normalizeType(query.type);
    const limit = clampLimit(query.limit);

    if (!isValidQuery(q, type)) {
      return reply.status(400).send({
        error: "Busca inválida",
        message: "Digite pelo menos 2 caracteres ou um CNPJ válido para buscar.",
      });
    }

    try {
      const { data, resolvedType } = await unifiedSearch(q, type, limit);
      return reply.send({
        data,
        meta: {
          q,
          type: resolvedType,
          total: data.length,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({
        error: "Falha na busca investigativa",
        message: formatErrorMessage(error),
      });
    }
  });
}

function normalizeType(value?: string): SearchQueryType {
  const type = (value?.trim().toLowerCase() || "auto") as SearchQueryType;
  return ALLOWED_TYPES.has(type) ? type : "auto";
}

function clampLimit(value?: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function isValidQuery(q: string, type: SearchQueryType): boolean {
  if (!q) return false;
  const digits = q.replace(/\D/g, "");
  const resolved = type === "auto" ? detectQueryKind(q) : type;

  if (resolved === "cnpj") return digits.length === 8 || digits.length === 14;
  if (resolved === "email") return q.includes("@") && q.length >= 1;
  if (resolved === "phone") return digits.length >= 8;
  return q.length >= 2;
}

function detectQueryKind(q: string): SearchQueryType {
  const digits = q.replace(/\D/g, "");
  if (digits.length === 8 || digits.length === 14) return "cnpj";
  if (q.includes("@")) return "email";
  if (digits.length >= 8 && digits.length / q.replace(/\s/g, "").length >= 0.6) return "phone";
  return "company";
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    return error.errors.map((item) => (item instanceof Error ? item.message : String(item))).join(" | ");
  }
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  return "Erro desconhecido";
}

import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) return null;
  return token.trim();
}

function resolveRole(appMetadata: Record<string, unknown> | undefined): string | undefined {
  const role = appMetadata?.role;
  return typeof role === "string" ? role : undefined;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (env.AUTH_DISABLED) return;

  const token = extractBearerToken(request.headers.authorization);
  if (!token) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Token ausente. Envie Authorization: Bearer <jwt>.",
    });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Token inválido ou expirado.",
    });
  }

  request.authUser = {
    id: data.user.id,
    email: data.user.email,
    role: resolveRole(data.user.app_metadata),
  };
}

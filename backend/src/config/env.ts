import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.string().default("development"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  CACHE_TTL_DAYS: z.coerce.number().default(30),
  PROVIDER_TIMEOUT_MS: z.coerce.number().default(12000),

  CNPJA_COMMERCIAL_API_KEY: z.string().optional(),
  ENABLE_CNPJA_COMMERCIAL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const env = envSchema.parse(process.env);

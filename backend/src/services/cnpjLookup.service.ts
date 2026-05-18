import { env } from "../config/env.js";
import { findCompanyByCnpj, upsertCompany } from "../repositories/company.repository.js";
import type { CompanyApiResponse, NormalizedCompany } from "../types/cnpj.js";
import { normalizeCompany } from "./normalizer.service.js";
import { lookupExternalProvider } from "./provider.service.js";

function isFresh(lastFetchedAt: string | null): boolean {
  if (!lastFetchedAt) return false;

  const last = new Date(lastFetchedAt).getTime();
  const now = Date.now();
  const ttlMs = env.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

  return now - last < ttlMs;
}

export async function lookupCompanyByCnpj(cnpj: string): Promise<CompanyApiResponse> {
  const cached = await findCompanyByCnpj(cnpj);

  if (cached?.normalized_data && isFresh(cached.last_fetched_at)) {
    return {
      data: cached.normalized_data as NormalizedCompany,
      raw: cached.raw_data,
      meta: {
        source: cached.source ?? "cache",
        cache: "hit",
        lastFetchedAt: cached.last_fetched_at,
      },
    };
  }

  const providerResult = await lookupExternalProvider(cnpj);
  const normalized = normalizeCompany(providerResult.raw, providerResult.source, cnpj);

  const saved = await upsertCompany({
    normalized,
    raw: providerResult.raw,
    source: providerResult.source,
  });

  return {
    data: normalized,
    raw: providerResult.raw,
    meta: {
      source: providerResult.source,
      cache: cached ? "stale" : "miss",
      lastFetchedAt: saved.last_fetched_at,
    },
  };
}

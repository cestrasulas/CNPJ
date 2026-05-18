import { env } from "../config/env.js";
import type { ProviderResult } from "../types/cnpj.js";

export async function lookupCnpjaCommercial(cnpj: string): Promise<ProviderResult> {
  if (!env.CNPJA_COMMERCIAL_API_KEY) {
    throw new Error("CNPJA_COMMERCIAL_API_KEY não configurada");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.cnpja.com/office/${cnpj}`, {
      signal: controller.signal,
      headers: {
        Authorization: env.CNPJA_COMMERCIAL_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`CNPJá Comercial respondeu com status ${response.status}`);
    }

    return {
      source: "cnpja_commercial",
      raw: await response.json(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

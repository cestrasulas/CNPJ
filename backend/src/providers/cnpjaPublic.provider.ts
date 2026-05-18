import { env } from "../config/env.js";
import type { ProviderResult } from "../types/cnpj.js";

export async function lookupCnpjaPublic(cnpj: string): Promise<ProviderResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(`https://open.cnpja.com/office/${cnpj}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`CNPJá Pública respondeu com status ${response.status}`);
    }

    return {
      source: "cnpja_public",
      raw: await response.json(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

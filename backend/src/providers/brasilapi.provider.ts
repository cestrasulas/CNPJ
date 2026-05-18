import { env } from "../config/env.js";
import type { ProviderResult } from "../types/cnpj.js";

export async function lookupBrasilApi(cnpj: string): Promise<ProviderResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`BrasilAPI respondeu com status ${response.status}`);
    }

    return {
      source: "brasilapi",
      raw: await response.json(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

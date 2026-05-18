import { env } from "../config/env.js";
import { lookupBrasilApi } from "../providers/brasilapi.provider.js";
import { lookupCnpjaCommercial } from "../providers/cnpjaCommercial.provider.js";
import { lookupCnpjaPublic } from "../providers/cnpjaPublic.provider.js";
import type { ProviderResult } from "../types/cnpj.js";

export async function lookupExternalProvider(cnpj: string): Promise<ProviderResult> {
  const providers = [
    ...(env.ENABLE_CNPJA_COMMERCIAL ? [lookupCnpjaCommercial] : []),
    lookupCnpjaPublic,
    lookupBrasilApi,
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      return await provider(cnpj);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`Todos os providers falharam: ${errors.join(" | ")}`);
}

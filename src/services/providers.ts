// path: src/services/providers.ts
import { apiGet } from "./api";
import type { JsonObject, ProviderId, ProviderResult } from "../types/cnpj";
import { somenteNumeros } from "../utils/formatters";

export async function consultarProvider(
  _provider: ProviderId,
  cnpj: string,
): Promise<ProviderResult> {
  const cnpjLimpo = somenteNumeros(cnpj);
  const data = await apiGet<unknown>(`/api/companies/${cnpjLimpo}`);

  if (!isObject(data)) throw new Error("JSON inesperado.");

  return { provider: "backend", raw: data };
}

function isObject(valor: unknown): valor is JsonObject {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}
// EOF

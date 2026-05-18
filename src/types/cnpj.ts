// path: src/types/cnpj.ts

export type ProviderId = "auto" | "cnpjws" | "cnpja" | "brasilapi";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type ProviderResult = {
  provider: Exclude<ProviderId, "auto"> | "backend";
  raw: JsonObject;
};

export type NormalizedCompany = {
  provider: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string;
  tipo: string;
  abertura: string;
  capitalSocial: string;
  porte: string;
  naturezaJuridica: string;
  email: string;
  emails: string[];
  telefone: string;
  telefones: string[];
  endereco: string;
  cidade: string;
  uf: string;
  cnaePrincipal: string;
  inscricoesEstaduais: string;
  inscricoesEstaduaisExtras: string[];
  socios: string[];
  simplesNacional: string;
  mei: string;
  raw: JsonObject;
};
// EOF
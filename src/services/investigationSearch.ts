import { apiGet } from "./api";

export type InvestigationSearchType =
  | "auto"
  | "cnpj"
  | "company"
  | "partner"
  | "address"
  | "phone"
  | "email";

export type InvestigationSearchResultType = "company" | "partner" | "address" | "phone" | "email";

export type InvestigationSearchResult = {
  id: string;
  type: InvestigationSearchResultType;
  label: string;
  subtitle: string;
  cnpjBasico?: string;
  cnpjCompleto?: string;
  evidenceHint?: string;
  investigationStatus?: "STRONG" | "PARTIAL" | "CADASTRAL";
};

type InvestigationSearchResponse = {
  data: InvestigationSearchResult[];
  meta: {
    q: string;
    type: InvestigationSearchType;
    total: number;
  };
};

export async function buscarInvestigativa(
  q: string,
  type: InvestigationSearchType = "auto",
  limit = 20,
): Promise<InvestigationSearchResponse> {
  const params = new URLSearchParams({ q, type, limit: String(limit) });
  return apiGet<InvestigationSearchResponse>(`/api/search?${params.toString()}`);
}

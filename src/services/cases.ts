import { apiGet, apiPost } from "./api";

export type CaseStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export type InvestigationCase = {
  id: string;
  title: string;
  description: string | null;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  entityCount?: number;
};

export type InvestigationCaseEntity = {
  id: string;
  caseId: string;
  entityType: string;
  entityValue: string;
  entityLabel: string | null;
  createdAt: string;
};

export type InvestigationCaseDetail = InvestigationCase & {
  entities: InvestigationCaseEntity[];
};

export async function listarCasosInvestigacao(): Promise<InvestigationCase[]> {
  const response = await apiGet<{ data: InvestigationCase[] }>("/api/cases");
  return response.data;
}

export async function obterCasoInvestigacao(id: string): Promise<InvestigationCaseDetail> {
  return apiGet<InvestigationCaseDetail>(`/api/cases/${id}`);
}

export async function criarCasoInvestigacao(input: {
  title: string;
  description?: string | null;
  status?: CaseStatus;
}): Promise<InvestigationCase> {
  return apiPost<InvestigationCase>("/api/cases", input);
}

export async function adicionarEntidadeAoCaso(
  caseId: string,
  input: {
    entityType: string;
    entityValue: string;
    entityLabel?: string | null;
  },
): Promise<InvestigationCaseEntity> {
  return apiPost<InvestigationCaseEntity>(`/api/cases/${caseId}/entities`, input);
}

export async function salvarInvestigacaoComoCaso(input: {
  cnpjBasico: string;
  razaoSocial?: string | null;
  notes?: string | null;
}): Promise<InvestigationCaseDetail> {
  const razao = input.razaoSocial?.trim();
  const title = razao ? `Investigação — ${razao}` : `Investigação — CNPJ ${input.cnpjBasico}`;
  const created = await criarCasoInvestigacao({
    title,
    description: input.notes?.trim() || null,
  });
  await adicionarEntidadeAoCaso(created.id, {
    entityType: "company",
    entityValue: input.cnpjBasico,
    entityLabel: razao || null,
  });
  return obterCasoInvestigacao(created.id);
}

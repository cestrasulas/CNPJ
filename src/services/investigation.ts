import { apiGet } from "./api";
import type { ReceitaEmpresa, ReceitaEstabelecimento } from "./receita";

export type InvestigationRelation = {
  type: "same_partner" | "same_address" | "same_root" | "same_phone" | "same_email";
  score: number;
  reason: string;
  company: ReceitaEmpresa;
};

export type InvestigationGraphNode = {
  id: string;
  type: "company" | "partner" | "address";
  label: string;
};

export type InvestigationGraphEdge = {
  from: string;
  to: string;
  type: string;
  label: string;
};

export type InvestigationReport = {
  target: {
    company: ReceitaEmpresa;
    establishments: ReceitaEstabelecimento[];
    partners: Array<{
      nome: string | null;
      documento: string | null;
      qualificacao: string | null;
      dataEntrada: string | null;
    }>;
  };
  summary: {
    totalPartners: number;
    totalRelatedByPartner: number;
    totalRelatedByAddress: number;
    totalBranches: number;
    riskHints: string[];
  };
  relations: InvestigationRelation[];
  graph: {
    nodes: InvestigationGraphNode[];
    edges: InvestigationGraphEdge[];
  };
};

export async function obterRelatorioInvestigacao(cnpjBasico: string): Promise<InvestigationReport> {
  return apiGet<InvestigationReport>(`/api/investigation/company/${cnpjBasico}`);
}

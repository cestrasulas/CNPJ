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

export type InvestigationFinding = {
  type:
    | "partner_network"
    | "shared_phone"
    | "shared_email"
    | "shared_address"
    | "branch_network"
    | "inactive_related"
    | "high_capital"
    | "data_gap";
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  description: string;
  evidence: string[];
};

export type InvestigationScore = {
  level: "LOW" | "MEDIUM" | "HIGH";
  points: number;
  reasons: string[];
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
    investigationLevel: "LOW" | "MEDIUM" | "HIGH";
    keyFindings: string[];
    totalPartners: number;
    totalRelatedCompanies: number;
    totalRelatedByPartner: number;
    totalRelatedByAddress: number;
    totalPhoneLinks: number;
    totalEmailLinks: number;
    totalBranches: number;
    riskHints: string[];
  };
  findings: InvestigationFinding[];
  investigationScore: InvestigationScore;
  relations: InvestigationRelation[];
  graph: {
    nodes: InvestigationGraphNode[];
    edges: InvestigationGraphEdge[];
  };
};

export type InvestigationAvailability = {
  cnpjBasico: string;
  hasPartners: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasAddress: boolean;
  canInvestigate: boolean;
};

export async function obterRelatorioInvestigacao(cnpjBasico: string): Promise<InvestigationReport> {
  return apiGet<InvestigationReport>(`/api/investigation/company/${cnpjBasico}`);
}

export async function obterDisponibilidadeInvestigacao(cnpjBasico: string): Promise<InvestigationAvailability> {
  return apiGet<InvestigationAvailability>(`/api/investigation/company/${cnpjBasico}/availability`);
}

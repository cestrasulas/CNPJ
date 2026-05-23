import { apiGet, apiUrl } from "./api";
import type { ReceitaEmpresa, ReceitaEstabelecimento } from "./receita";

export type InvestigationRelationEvidence = {
  source: string;
  sourceType: "receita_local" | "provider_cache" | "manual" | "derived";
  collectedAt: string | null;
  field: string;
  value: string;
  explanation: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
};

export type EvidenceClassification = "DECLARADO" | "INFERIDO" | "VALIDADO" | "COMPROVADO";

export type EntityConfidence = {
  level: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
};

export type InvestigationRelation = {
  type: "same_partner" | "same_address" | "same_root" | "same_phone" | "same_email";
  score: number;
  reason: string;
  company: ReceitaEmpresa;
  classification: EvidenceClassification;
  evidence: InvestigationRelationEvidence;
  entityConfidence?: EntityConfidence;
};

export type InvestigationGraphNode = {
  id: string;
  type: "company" | "partner" | "address" | "phone" | "email";
  label: string;
  cnpjBasico?: string;
};

export type InvestigationGraphEdge = {
  from: string;
  to: string;
  type: string;
  label: string;
  relationType: string;
  classification: EvidenceClassification;
  evidence: InvestigationRelationEvidence;
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

export type EvidenceStrength = {
  level: "LOW" | "MEDIUM" | "HIGH";
  points: number;
  reasons: string[];
  limitations: string[];
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
      faixaEtaria: string | null;
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
    dataLimitations: string[];
  };
  findings: InvestigationFinding[];
  evidenceStrength: EvidenceStrength;
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

export async function obterRelatorioInvestigacao(
  cnpjBasico: string,
  depth: 1 | 2 = 1,
): Promise<InvestigationReport> {
  return apiGet<InvestigationReport>(`/api/investigation/company/${cnpjBasico}?depth=${depth}`);
}

export async function obterDisponibilidadeInvestigacao(cnpjBasico: string): Promise<InvestigationAvailability> {
  return apiGet<InvestigationAvailability>(`/api/investigation/company/${cnpjBasico}/availability`);
}

export function obterUrlDossieInvestigacao(cnpjBasico: string): string {
  return apiUrl(`/api/investigation/company/${cnpjBasico}/dossier.html`);
}

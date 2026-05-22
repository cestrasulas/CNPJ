import { apiGet } from "./api";

export type StatusInvestigacao = "STRONG" | "PARTIAL" | "CADASTRAL";

export type ReceitaEmpresa = {
  cnpjBasico: string;
  razaoSocial: string | null;
  naturezaJuridica: string | null;
  qualificacaoResponsavel: string | null;
  capitalSocial: string | null;
  porte: string | null;
  situacaoCadastral?: string | null;
  temEstabelecimento?: boolean | null;
  temSocio?: boolean | null;
  statusInvestigacao?: StatusInvestigacao | null;
};

export function resolveStatusInvestigacao(empresa: ReceitaEmpresa): StatusInvestigacao | null {
  if (empresa.statusInvestigacao) return empresa.statusInvestigacao;
  if (empresa.temEstabelecimento == null && empresa.temSocio == null) return null;
  if (empresa.temSocio) return "STRONG";
  if (empresa.temEstabelecimento) return "PARTIAL";
  return "CADASTRAL";
}

export type ReceitaEstabelecimento = {
  cnpj: string;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  cnaePrincipal: string | null;
  municipio: string | null;
  municipioNome?: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  enderecoNormalizado?: string | null;
};

export type ReceitaEstabelecimentoSample = {
  cnpjBasico: string;
  cnpjCompleto: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  cnaePrincipal: string | null;
  municipio: string | null;
  uf: string | null;
};

type ReceitaSearchResponse = {
  data: ReceitaEmpresa[];
  meta: {
    q: string;
    limit: number;
    total: number;
  };
};

type ReceitaEstabelecimentosResponse = {
  data: ReceitaEstabelecimento[];
  meta: {
    cnpjBasico: string;
    limit: number;
    total: number;
  };
};

type ReceitaEstabelecimentosSampleResponse = {
  data: ReceitaEstabelecimentoSample[];
  meta: {
    limit: number;
    total: number;
  };
};

export async function buscarReceitaFederal(q: string, limit = 20): Promise<ReceitaEmpresa[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const response = await apiGet<ReceitaSearchResponse>(`/api/receita/search?${params.toString()}`);
  return response.data;
}

export async function listarEstabelecimentosReceita(cnpjBasico: string): Promise<ReceitaEstabelecimento[]> {
  const response = await apiGet<ReceitaEstabelecimentosResponse>(
    `/api/receita/companies/${cnpjBasico}/establishments`,
  );
  return response.data;
}

export async function listarAmostraEstabelecimentosReceita(limit = 20): Promise<ReceitaEstabelecimentoSample[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiGet<ReceitaEstabelecimentosSampleResponse>(
    `/api/receita/debug/establishments-sample?${params.toString()}`,
  );
  return response.data;
}

type ReceitaInvestigaveisResponse = {
  data: ReceitaEmpresa[];
  meta: { limit: number; total: number };
};

export async function listarInvestigaveis(limit = 20): Promise<ReceitaEmpresa[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiGet<ReceitaInvestigaveisResponse>(
    `/api/receita/investigaveis?${params.toString()}`,
  );
  return response.data;
}

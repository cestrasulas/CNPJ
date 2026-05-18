import type { NormalizedCompany } from "../types/cnpj";

export const DADOS_INDISPONIVEIS = "Dados não disponíveis no provedor atual";

export type BuscaLocalItem = {
  id: string;
  tipo: string;
  valor: string;
  disponivel: boolean;
};

export type NavegacaoRelacionada = {
  id: string;
  tipo: "cnae" | "socio" | "cidade";
  label: string;
  valor: string;
  disponivel: boolean;
};

export type EmpresaRelacionadaLocal = {
  company: NormalizedCompany;
  motivos: string[];
  score: number;
};

export type IndiceBuscaLocal = {
  itens: BuscaLocalItem[];
  relacionados: NavegacaoRelacionada[];
};

export function montarIndiceBuscaLocal(company: NormalizedCompany): IndiceBuscaLocal {
  const socios = company.socios ?? [];
  const cidade = [company.cidade, company.uf].filter(Boolean).join(" / ");
  const itens: BuscaLocalItem[] = [
    criarItem("razao-social", "Razão social", company.razaoSocial),
    criarItem("nome-fantasia", "Nome fantasia", company.nomeFantasia),
    criarItem("cnae", "CNAE", company.cnaePrincipal),
    criarItem("cidade", "Cidade", cidade),
    criarItem("email", "E-mail", company.email),
    ...(socios.length
      ? socios.map((socio, index) => criarItem(`socio-${index}`, "Sócio", socio))
      : [criarItem("socio-indisponivel", "Sócio", "")]),
  ];

  return {
    itens,
    relacionados: [
      criarRelacionado("cnae", "CNAE", company.cnaePrincipal),
      criarRelacionado("cidade", "Cidade", cidade),
      ...(socios.length
        ? socios.map((socio, index) => criarRelacionado("socio", `Sócio ${index + 1}`, socio))
        : [criarRelacionado("socio", "Sócio", "")]),
    ],
  };
}

export function buscarLocal(indice: IndiceBuscaLocal, termo: string): BuscaLocalItem[] {
  const termoNormalizado = normalizarTexto(termo);
  if (!termoNormalizado) return indice.itens;

  return indice.itens.filter((item) => {
    const texto = normalizarTexto(`${item.tipo} ${item.valor}`);
    return texto.includes(termoNormalizado);
  });
}

export function calcularRelacionamentosLocais(
  base: NormalizedCompany,
  candidatas: NormalizedCompany[],
): EmpresaRelacionadaLocal[] {
  return candidatas
    .filter((company) => normalizarTexto(company.cnpj) !== normalizarTexto(base.cnpj))
    .map((company) => pontuarRelacionamento(base, company))
    .filter((relacao) => relacao.score > 0)
    .sort((a, b) => b.score - a.score);
}

function pontuarRelacionamento(base: NormalizedCompany, company: NormalizedCompany): EmpresaRelacionadaLocal {
  const motivos: string[] = [];
  let score = 0;

  if (temIntersecao(base.socios ?? [], company.socios ?? [])) {
    score += 50;
    motivos.push("sócio em comum");
  }

  if (temIntersecao(base.telefones ?? [], company.telefones ?? [])) {
    score += 30;
    motivos.push("telefone igual");
  }

  if (temIntersecao(base.emails ?? [], company.emails ?? [])) {
    score += 30;
    motivos.push("email igual");
  }

  if (normalizarTexto(base.endereco) && normalizarTexto(base.endereco) === normalizarTexto(company.endereco)) {
    score += 25;
    motivos.push("endereço igual");
  }

  if (normalizarTexto(base.cnaePrincipal) && normalizarTexto(base.cnaePrincipal) === normalizarTexto(company.cnaePrincipal)) {
    score += 20;
    motivos.push("CNAE igual");
  }

  if (normalizarTexto(base.cidade) && normalizarTexto(base.uf)) {
    const localBase = normalizarTexto(`${base.cidade}/${base.uf}`);
    const localCompany = normalizarTexto(`${company.cidade}/${company.uf}`);
    if (localBase === localCompany) {
      score += 10;
      motivos.push("cidade/UF igual");
    }
  }

  return { company, motivos, score };
}

function temIntersecao(base: string[], comparada: string[]): boolean {
  const valoresBase = new Set(base.map(normalizarTexto).filter(Boolean));
  return comparada.some((valor) => valoresBase.has(normalizarTexto(valor)));
}

function criarItem(id: string, tipo: string, valor: string): BuscaLocalItem {
  const valorLimpo = valor.trim();
  return {
    id,
    tipo,
    valor: valorLimpo || DADOS_INDISPONIVEIS,
    disponivel: Boolean(valorLimpo),
  };
}

function criarRelacionado(
  tipo: NavegacaoRelacionada["tipo"],
  label: string,
  valor: string,
): NavegacaoRelacionada {
  const valorLimpo = valor.trim();
  return {
    id: `${tipo}-${normalizarTexto(label)}-${normalizarTexto(valorLimpo) || "indisponivel"}`,
    tipo,
    label,
    valor: valorLimpo || DADOS_INDISPONIVEIS,
    disponivel: Boolean(valorLimpo),
  };
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

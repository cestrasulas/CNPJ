import type { NormalizedCompany } from "../types/cnpj";

export const DADO_INDISPONIVEL_COMPARACAO = "Dado não disponível";

export type CampoComparacao = {
  id: string;
  label: string;
  valor: (company: NormalizedCompany) => string;
};

export type EmpresaRelacionada = {
  company: NormalizedCompany;
  motivos: string[];
};

export const CAMPOS_COMPARACAO: CampoComparacao[] = [
  { id: "razao", label: "Razão social", valor: (company) => company.razaoSocial },
  { id: "cnpj", label: "CNPJ", valor: (company) => company.cnpj },
  { id: "situacao", label: "Situação", valor: (company) => company.situacao },
  { id: "endereco", label: "Endereço", valor: (company) => company.endereco },
  { id: "cnae", label: "CNAE", valor: (company) => company.cnaePrincipal },
  { id: "capital", label: "Capital social", valor: (company) => company.capitalSocial },
  { id: "porte", label: "Porte", valor: (company) => company.porte },
  { id: "natureza", label: "Natureza jurídica", valor: (company) => company.naturezaJuridica },
  { id: "socios", label: "Sócios", valor: (company) => (company.socios ?? []).join(" | ") },
];

export function valorComparacao(company: NormalizedCompany, campo: CampoComparacao): string {
  return (campo.valor(company) || "").trim() || DADO_INDISPONIVEL_COMPARACAO;
}

export function gerarCsvComparacao(companies: NormalizedCompany[]): string {
  const linhas = [
    ["Campo", ...companies.map((company) => company.razaoSocial || company.cnpj || DADO_INDISPONIVEL_COMPARACAO)],
    ...CAMPOS_COMPARACAO.map((campo) => [
      campo.label,
      ...companies.map((company) => valorComparacao(company, campo)),
    ]),
  ];

  return linhas.map((linha) => linha.map(escaparCsv).join(",")).join("\n");
}

export function gerarHtmlComparacao(companies: NormalizedCompany[]): string {
  const cabecalhos = companies.map((company) => escaparHtml(company.razaoSocial || company.cnpj || "Empresa"));
  const linhas = CAMPOS_COMPARACAO.map((campo) => {
    const valores = companies
      .map((company) => `<td>${escaparHtml(valorComparacao(company, campo))}</td>`)
      .join("");
    return `<tr><th>${escaparHtml(campo.label)}</th>${valores}</tr>`;
  }).join("");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Comparação de empresas</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
      h1 { font-size: 24px; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; }
    </style>
  </head>
  <body>
    <h1>Comparação de empresas</h1>
    <table>
      <thead><tr><th>Campo</th>${cabecalhos.map((cabecalho) => `<th>${cabecalho}</th>`).join("")}</tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </body>
</html>`;
}

export function encontrarEmpresasRelacionadas(
  base: NormalizedCompany,
  candidatas: NormalizedCompany[],
): EmpresaRelacionada[] {
  return candidatas
    .filter((company) => company.cnpj !== base.cnpj)
    .map((company) => ({ company, motivos: motivosRelacionamento(base, company) }))
    .filter((item) => item.motivos.length > 0);
}

function motivosRelacionamento(base: NormalizedCompany, candidata: NormalizedCompany): string[] {
  const motivos: string[] = [];

  if (normalizar(base.cnaePrincipal) && normalizar(base.cnaePrincipal) === normalizar(candidata.cnaePrincipal)) {
    motivos.push("CNAE igual");
  }

  if (normalizar(base.cidade) && normalizar(base.cidade) === normalizar(candidata.cidade)) {
    motivos.push("Cidade igual");
  }

  if (temSocioEmComum(base, candidata)) {
    motivos.push("Sócio em comum");
  }

  return motivos;
}

function temSocioEmComum(base: NormalizedCompany, candidata: NormalizedCompany): boolean {
  const sociosBase = new Set((base.socios ?? []).map(normalizar).filter(Boolean));
  return (candidata.socios ?? []).some((socio) => sociosBase.has(normalizar(socio)));
}

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escaparCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

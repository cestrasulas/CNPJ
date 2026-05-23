import {
  findFirstReceitaEstabelecimentoByCnpjBasico,
  searchReceitaAddresses,
  searchReceitaByCnpjBasico,
  searchReceitaByCnpjCompleto,
  searchReceitaCompaniesByAddress,
  searchReceitaCompaniesByCep,
  searchReceitaCompaniesByEmail,
  searchReceitaCompaniesByMunicipio,
  searchReceitaCompaniesByPartner,
  searchReceitaCompaniesByPhone,
  searchReceitaEmails,
  searchReceitaEmpresas,
  searchReceitaMunicipios,
  searchReceitaPartners,
  searchReceitaPhones,
  type ReceitaEmpresaRow,
} from "../repositories/receita.repository.js";
import { looksLikeCep, normalizeAddressQuery, normalizeCep } from "../lib/addressNormalize.js";
import { onlyDigits } from "../utils/cnpj.js";

export type SearchResultType = "company" | "partner" | "address" | "phone" | "email";
export type SearchQueryType = "auto" | "cnpj" | "company" | "partner" | "address" | "phone" | "email";
export type InvestigationStatus = "STRONG" | "PARTIAL" | "CADASTRAL";

export type SearchResultItem = {
  id: string;
  type: SearchResultType;
  label: string;
  subtitle: string;
  cnpjBasico?: string;
  cnpjCompleto?: string;
  evidenceHint?: string;
  investigationStatus?: InvestigationStatus;
};

export async function unifiedSearch(q: string, type: SearchQueryType, limit: number) {
  const trimmed = q.trim();
  const perTypeLimit = Math.min(Math.max(Math.ceil(limit / 2), 5), limit);

  if (!trimmed) {
    return { data: [] as SearchResultItem[], resolvedType: type };
  }

  const resolvedType = type === "auto" ? detectAutoType(trimmed) : type;
  let data: SearchResultItem[] = [];

  if (type === "auto" && resolvedType === "company") {
    data = dedupeResults([
      ...(await searchCompanies(trimmed, perTypeLimit)),
      ...(await searchPartners(trimmed, perTypeLimit)),
    ]).slice(0, limit);
    return { data, resolvedType: "company" };
  }

  switch (resolvedType) {
    case "cnpj":
      data = await searchByCnpj(trimmed, limit);
      break;
    case "company":
      data = await searchCompanies(trimmed, limit);
      break;
    case "partner":
      data = await searchPartners(trimmed, limit);
      break;
    case "phone":
      data = await searchPhones(trimmed, limit);
      break;
    case "email":
      data = await searchEmails(trimmed, limit);
      break;
    case "address":
      data = await searchAddresses(trimmed, limit);
      break;
  }

  return { data: dedupeResults(data).slice(0, limit), resolvedType };
}

function detectAutoType(q: string): SearchQueryType {
  const digits = onlyDigits(q);
  if (digits.length === 14) return "cnpj";
  if (digits.length === 8) return looksLikeCep(q) ? "address" : "cnpj";
  if (q.includes("@")) return "email";
  if (looksLikePhone(q)) return "phone";
  return "company";
}

function looksLikePhone(q: string): boolean {
  const digits = onlyDigits(q);
  return digits.length >= 8 && digits.length / q.replace(/\s/g, "").length >= 0.6;
}

async function searchByCnpj(q: string, limit: number): Promise<SearchResultItem[]> {
  const digits = onlyDigits(q);
  if (digits.length === 14) {
    const rows = await searchReceitaByCnpjCompleto(digits);
    return rows.map((row) => mapCompanyRow(row, row.cnpj_completo, "CNPJ completo encontrado na base local."));
  }

  if (digits.length === 8) {
    const rows = await searchReceitaByCnpjBasico(digits);
    const mapped = await Promise.all(
      rows.map(async (row) => {
        const cnpjCompleto = await findFirstReceitaEstabelecimentoByCnpjBasico(row.cnpj_basico);
        return mapCompanyRow(row, cnpjCompleto ?? undefined, "CNPJ básico encontrado na base local.");
      }),
    );
    return mapped;
  }

  return [];
}

async function searchCompanies(q: string, limit: number): Promise<SearchResultItem[]> {
  const results: SearchResultItem[] = [];
  const seen = new Set<string>();

  const addCompanyRows = (rows: ReceitaEmpresaRow[], subtitle: string, evidenceHint: string) => {
    for (const row of rows) {
      const item = mapCompanyRow(row, undefined, evidenceHint, subtitle);
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      results.push(item);
    }
  };

  addCompanyRows(await searchReceitaEmpresas(q, limit), "Empresa encontrada por razão social.", "Evidência declarada em fonte cadastral.");
  addCompanyRows(
    await searchReceitaCompaniesByPartner(q, limit),
    "Empresa vinculada a sócio/administrador.",
    "Estrutura societária conhecida na base local.",
  );

  const municipios = await searchReceitaMunicipios(q, 3);
  if (municipios.length > 0) {
    addCompanyRows(
      await searchReceitaCompaniesByMunicipio(q, limit),
      `Empresa(s) no município ${municipios[0].nome}.`,
      "Evidência declarada por município cadastral.",
    );
  }

  const digits = onlyDigits(q);
  if (looksLikePhone(q)) {
    addCompanyRows(
      await searchReceitaCompaniesByPhone(digits, limit),
      "Empresa vinculada por telefone cadastral.",
      "Evidência inferida por telefone compartilhado.",
    );
  }

  if (q.includes("@")) {
    addCompanyRows(
      await searchReceitaCompaniesByEmail(q, limit),
      "Empresa vinculada por e-mail cadastral.",
      "Evidência inferida por e-mail compartilhado.",
    );
  }

  if (!looksLikePhone(q) && !q.includes("@") && q.trim().length >= 8) {
    const normalizedAddress = normalizeAddressQuery(q);
    const byAddress = await searchReceitaCompaniesByAddress(normalizedAddress, limit);
    if (byAddress.length > 0) {
      addCompanyRows(
        byAddress,
        "Empresa vinculada por endereço cadastral.",
        "Evidência inferida por endereço compartilhado.",
      );
    }
  }

  return results.slice(0, limit);
}

async function searchPartners(q: string, limit: number): Promise<SearchResultItem[]> {
  const rows = await searchReceitaPartners(q, limit);
  return rows.map((row) => ({
    id: `partner:${normalizeKey(row.nome_socio)}`,
    type: "partner",
    label: row.nome_socio,
    subtitle: `${row.total_empresas} empresa(s) na base local`,
    evidenceHint: "Sócio/administrador declarado na Receita pública.",
  }));
}

async function searchPhones(q: string, limit: number): Promise<SearchResultItem[]> {
  const rows = await searchReceitaPhones(q, limit);
  return rows.map((row) => ({
    id: `phone:${row.valor}`,
    type: "phone",
    label: row.valor,
    subtitle: `${row.total_empresas} empresa(s) com este telefone`,
    evidenceHint: "Telefone cadastral compartilhado — evidência inferida.",
  }));
}

async function searchEmails(q: string, limit: number): Promise<SearchResultItem[]> {
  const rows = await searchReceitaEmails(q, limit);
  return rows.map((row) => ({
    id: `email:${row.valor}`,
    type: "email",
    label: row.valor,
    subtitle: `${row.total_empresas} empresa(s) com este e-mail`,
    evidenceHint: "E-mail cadastral compartilhado — evidência inferida.",
  }));
}

async function searchAddresses(q: string, limit: number): Promise<SearchResultItem[]> {
  if (looksLikeCep(q)) {
    const cep = normalizeCep(q);
    const companies = await searchReceitaCompaniesByCep(cep, limit);
    if (companies.length > 0) {
      return companies.map((row) =>
        mapCompanyRow(row, undefined, "Evidência inferida por CEP cadastral.", `CEP ${cep}`),
      );
    }
  }

  const normalized = normalizeAddressQuery(q);
  const rows = await searchReceitaAddresses(normalized, limit);
  return rows.map((row) => ({
    id: `address:${normalizeKey(row.valor)}`,
    type: "address",
    label: row.valor,
    subtitle: `${row.total_empresas} empresa(s) neste endereço`,
    evidenceHint: "Endereço cadastral compartilhado — evidência inferida.",
  }));
}

function mapCompanyRow(
  row: ReceitaEmpresaRow,
  cnpjCompleto?: string,
  evidenceHint = "Empresa encontrada na base local.",
  subtitle?: string,
): SearchResultItem {
  const temEstabelecimento = row.tem_estabelecimento ?? null;
  const temSocio = row.tem_socio ?? null;

  return {
    id: `company:${row.cnpj_basico}`,
    type: "company",
    label: row.razao_social || row.cnpj_basico,
    subtitle: subtitle || `CNPJ básico ${row.cnpj_basico}`,
    cnpjBasico: row.cnpj_basico,
    cnpjCompleto,
    evidenceHint,
    investigationStatus: computeStatusInvestigacao(temSocio, temEstabelecimento),
  };
}

function computeStatusInvestigacao(
  temSocio: boolean | null | undefined,
  temEstabelecimento: boolean | null | undefined,
): InvestigationStatus | undefined {
  if (temSocio == null && temEstabelecimento == null) return undefined;
  if (temSocio) return "STRONG";
  if (temEstabelecimento) return "PARTIAL";
  return "CADASTRAL";
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeResults(items: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

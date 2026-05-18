import { listCompaniesForRelations } from "../repositories/company.repository.js";
import type { CompanyRelation, CompanyRelationsResponse, NormalizedCompany } from "../types/cnpj.js";
import { lookupCompanyByCnpj } from "./cnpjLookup.service.js";

const DEFAULT_LIMIT = 10;

export async function getCompanyRelations(cnpj: string, limit = DEFAULT_LIMIT): Promise<CompanyRelationsResponse> {
  const base = (await lookupCompanyByCnpj(cnpj)).data;
  const candidates = await listCompaniesForRelations();
  const relations = scoreRelations(base, candidates).slice(0, limit);

  return {
    data: relations,
    meta: {
      cnpj: base.cnpj,
      limit,
      total: relations.length,
    },
  };
}

function scoreRelations(base: NormalizedCompany, candidates: NormalizedCompany[]): CompanyRelation[] {
  return candidates
    .filter((company) => normalize(company.cnpj) !== normalize(base.cnpj))
    .map((company) => scoreCompany(base, company))
    .filter((relation) => relation.score > 0)
    .sort((a, b) => b.score - a.score);
}

function scoreCompany(base: NormalizedCompany, company: NormalizedCompany): CompanyRelation {
  const reasons: string[] = [];
  let score = 0;

  const sharedPartner = firstIntersection(
    base.partners.map((partner) => partner.name),
    company.partners.map((partner) => partner.name),
  );
  if (sharedPartner) {
    score += 50;
    reasons.push(`Sócio em comum: ${sharedPartner}`);
  }

  const sharedPhone = firstIntersection(contactValues(base, "phone"), contactValues(company, "phone"));
  if (sharedPhone) {
    score += 30;
    reasons.push(`Telefone igual: ${sharedPhone}`);
  }

  const sharedEmail = firstIntersection(contactValues(base, "email"), contactValues(company, "email"));
  if (sharedEmail) {
    score += 30;
    reasons.push(`E-mail igual: ${sharedEmail}`);
  }

  const baseAddress = addressKey(base);
  const companyAddress = addressKey(company);
  if (baseAddress && baseAddress === companyAddress) {
    score += 25;
    reasons.push("Endereço igual");
  }

  const baseCnae = primaryCnae(base);
  const companyCnae = primaryCnae(company);
  if (baseCnae && baseCnae === companyCnae) {
    score += 20;
    reasons.push(`CNAE igual: ${baseCnae}`);
  }

  const baseCityState = cityStateKey(base);
  const companyCityState = cityStateKey(company);
  if (baseCityState && baseCityState === companyCityState) {
    score += 10;
    reasons.push(`Cidade/UF igual: ${baseCityState}`);
  }

  return {
    company,
    score: Math.min(score, 100),
    reasons,
  };
}

function contactValues(company: NormalizedCompany, type: "email" | "phone"): string[] {
  return company.contacts.filter((contact) => contact.type === type).map((contact) => contact.value);
}

function primaryCnae(company: NormalizedCompany): string {
  return normalize(company.mainCnae || company.cnaes.find((cnae) => cnae.isPrimary)?.code || "");
}

function cityStateKey(company: NormalizedCompany): string {
  const city = normalize(company.address?.city || "");
  const state = normalize(company.address?.state || "");
  return city && state ? `${city}/${state}` : "";
}

function addressKey(company: NormalizedCompany): string {
  const address = company.address;
  if (!address) return "";

  return normalize(
    [
      address.street,
      address.number,
      address.complement,
      address.district,
      address.city,
      address.state,
      address.zipCode,
    ]
      .filter(Boolean)
      .join("|"),
  );
}

function firstIntersection(base: string[], candidate: string[]): string {
  const normalizedBase = new Map<string, string>(
    base
      .map((value): [string, string] => [normalize(value), value])
      .filter(([key]) => Boolean(key)),
  );

  for (const value of candidate) {
    if (normalizedBase.has(normalize(value))) return value;
  }

  return "";
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

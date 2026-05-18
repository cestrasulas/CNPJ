import type {
  NormalizedCnae,
  NormalizedCompany,
  NormalizedContact,
  NormalizedPartner,
} from "../types/cnpj.js";
import { onlyDigits } from "../utils/cnpj.js";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

export function normalizeCompany(raw: unknown, source: string, fallbackCnpj: string): NormalizedCompany {
  const data = asRecord(raw);
  const company = asRecord(data.company);
  const address = asRecord(data.address);
  const mainActivity = asRecord(data.mainActivity);
  const status = asRecord(data.status);
  const size = asRecord(company.size);
  const nature = asRecord(company.nature);
  const primaryActivity = Array.isArray(data.cnae_fiscal_descricao) ? {} : asRecord(data.primary_activity);

  const cnpj = onlyDigits(firstString(data.cnpj, data.taxId, data.cnpj_basico, fallbackCnpj) ?? fallbackCnpj);

  const legalName = firstString(
    data.razao_social,
    data.nome,
    data.name,
    company.name,
    company.legalName,
    data.legalName,
  );

  const tradeName = firstString(data.nome_fantasia, data.alias, data.tradeName, company.tradeName);

  const mainCnae = firstString(data.cnae_fiscal, data.mainCnae, mainActivity.id, primaryActivity.code);

  const mainCnaeDescription = firstString(
    data.cnae_fiscal_descricao,
    data.mainCnaeDescription,
    mainActivity.text,
    primaryActivity.description,
  );

  const contacts: NormalizedContact[] = [];

  const email = firstString(data.email, data.email_address);
  if (email) contacts.push({ type: "email", value: email });

  const phone = firstString(data.telefone, data.phone);
  if (phone) contacts.push({ type: "phone", value: phone });

  if (Array.isArray(data.emails)) {
    for (const item of data.emails) {
      const record = asRecord(item);
      const value = firstString(record.address, record.email, item);
      if (value) contacts.push({ type: "email", value });
    }
  }

  if (Array.isArray(data.phones)) {
    for (const item of data.phones) {
      const record = asRecord(item);
      const number = firstString(record.number, record.phone, item);
      const area = firstString(record.area);
      const value = number && area ? `(${area}) ${number}` : number;
      if (value) contacts.push({ type: "phone", value });
    }
  }

  const partners: NormalizedPartner[] = [];

  const rawPartners = Array.isArray(data.qsa)
    ? data.qsa
    : Array.isArray(data.members)
      ? data.members
      : Array.isArray(company.members)
        ? company.members
        : Array.isArray(data.partners)
          ? data.partners
          : [];

  for (const item of rawPartners) {
    const partner = asRecord(item);
    const person = asRecord(partner.person);
    const name = firstString(partner.nome_socio, partner.name, person.name);

    if (!name) continue;

    partners.push({
      name,
      documentMasked: firstString(partner.cnpj_cpf_do_socio, partner.taxId, person.taxId),
      role: firstString(asRecord(partner.role).text, partner.role),
      qualification: firstString(partner.qualificacao_socio, partner.qualification, asRecord(partner.role).text),
      entryDate: firstString(partner.data_entrada_sociedade, partner.since),
    });
  }

  const cnaes: NormalizedCnae[] = [];

  if (mainCnae) {
    cnaes.push({
      code: onlyDigits(mainCnae),
      description: mainCnaeDescription,
      isPrimary: true,
    });
  }

  const secondaryActivities = Array.isArray(data.secondary_activities)
    ? data.secondary_activities
    : Array.isArray(data.sideActivities)
      ? data.sideActivities
      : [];

  for (const item of secondaryActivities) {
    const activity = asRecord(item);
    const code = firstString(activity.code, activity.id);
    if (!code) continue;

    cnaes.push({
      code: onlyDigits(code),
      description: firstString(activity.description, activity.text),
      isPrimary: false,
    });
  }

  return {
    cnpj,
    legalName,
    tradeName,
    status: firstString(data.descricao_situacao_cadastral, status.text, data.status, data.statusText),
    openingDate: firstString(data.data_inicio_atividade, data.founded, data.openingDate),
    mainCnae: mainCnae ? onlyDigits(mainCnae) : null,
    mainCnaeDescription,
    legalNature: firstString(data.natureza_juridica, data.legalNature, nature.text, company.nature),
    size: firstString(data.porte, data.size, size.text, company.size),
    capital: firstNumber(data.capital_social, data.equity, company.equity),
    address: {
      street: firstString(data.logradouro, address.street),
      number: firstString(data.numero, address.number),
      complement: firstString(data.complemento, address.details),
      district: firstString(data.bairro, address.district),
      city: firstString(data.municipio, address.city),
      state: firstString(data.uf, address.state),
      zipCode: onlyDigits(firstString(data.cep, address.zip) ?? ""),
      country: "Brasil",
    },
    contacts,
    partners,
    cnaes,
  };
}

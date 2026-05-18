import { supabase } from "../lib/supabase.js";
import type { NormalizedCompany } from "../types/cnpj.js";
import { normalizeEmail, normalizePhone } from "../utils/cnpj.js";

export async function findCompanyByCnpj(cnpj: string) {
  const { data, error } = await supabase.from("companies").select("*").eq("cnpj", cnpj).maybeSingle();

  if (error) throw error;
  return data;
}

export async function listCompaniesForRelations(limit = 200): Promise<NormalizedCompany[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("normalized_data")
    .not("normalized_data", "is", null)
    .order("last_fetched_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => row.normalized_data as NormalizedCompany | null)
    .filter((company): company is NormalizedCompany => Boolean(company?.cnpj));
}

export async function upsertCompany(params: {
  normalized: NormalizedCompany;
  raw: unknown;
  source: string;
}) {
  const { normalized, raw, source } = params;

  const { data: company, error } = await supabase
    .from("companies")
    .upsert(
      {
        cnpj: normalized.cnpj,
        legal_name: normalized.legalName,
        trade_name: normalized.tradeName,
        status: normalized.status,
        opening_date: normalized.openingDate,
        main_cnae: normalized.mainCnae,
        main_cnae_description: normalized.mainCnaeDescription,
        legal_nature: normalized.legalNature,
        size: normalized.size,
        capital: normalized.capital,
        source,
        normalized_data: normalized,
        raw_data: raw,
        last_fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cnpj" },
    )
    .select("*")
    .single();

  if (error) throw error;

  await replaceCompanyChildren(company.id, normalized, source);

  return company;
}

async function replaceCompanyChildren(companyId: string, normalized: NormalizedCompany, source: string) {
  await supabase.from("company_addresses").delete().eq("company_id", companyId);
  await supabase.from("company_contacts").delete().eq("company_id", companyId);
  await supabase.from("company_cnaes").delete().eq("company_id", companyId);
  await supabase.from("company_partners").delete().eq("company_id", companyId);

  if (normalized.address) {
    await supabase.from("company_addresses").insert({
      company_id: companyId,
      street: normalized.address.street,
      number: normalized.address.number,
      complement: normalized.address.complement,
      district: normalized.address.district,
      city: normalized.address.city,
      state: normalized.address.state,
      zip_code: normalized.address.zipCode,
      country: normalized.address.country ?? "Brasil",
    });
  }

  if (normalized.contacts.length > 0) {
    await supabase.from("company_contacts").insert(
      normalized.contacts.map((contact) => ({
        company_id: companyId,
        type: contact.type,
        value: contact.value,
        normalized_value:
          contact.type === "email"
            ? normalizeEmail(contact.value)
            : contact.type === "phone"
              ? normalizePhone(contact.value)
              : contact.value.trim().toLowerCase(),
        source,
      })),
    );
  }

  if (normalized.cnaes.length > 0) {
    await supabase.from("company_cnaes").insert(
      normalized.cnaes.map((cnae) => ({
        company_id: companyId,
        code: cnae.code,
        description: cnae.description,
        is_primary: cnae.isPrimary,
      })),
    );
  }

  for (const partner of normalized.partners) {
    const { data: person, error: personError } = await supabase
      .from("people")
      .upsert(
        {
          name: partner.name,
          document_masked: partner.documentMasked,
        },
        { onConflict: "name,document_masked" },
      )
      .select("*")
      .single();

    if (personError) throw personError;

    await supabase.from("company_partners").upsert(
      {
        company_id: companyId,
        person_id: person.id,
        role: partner.role,
        qualification: partner.qualification,
        entry_date: partner.entryDate,
      },
      { onConflict: "company_id,person_id,role" },
    );
  }
}

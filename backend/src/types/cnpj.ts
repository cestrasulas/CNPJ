export type NormalizedAddress = {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
};

export type NormalizedContact = {
  type: "email" | "phone" | "website";
  value: string;
};

export type NormalizedPartner = {
  name: string;
  documentMasked?: string | null;
  role?: string | null;
  qualification?: string | null;
  entryDate?: string | null;
};

export type NormalizedCnae = {
  code: string;
  description?: string | null;
  isPrimary: boolean;
};

export type NormalizedCompany = {
  cnpj: string;
  legalName?: string | null;
  tradeName?: string | null;
  status?: string | null;
  openingDate?: string | null;
  mainCnae?: string | null;
  mainCnaeDescription?: string | null;
  legalNature?: string | null;
  size?: string | null;
  capital?: number | null;
  address?: NormalizedAddress | null;
  contacts: NormalizedContact[];
  partners: NormalizedPartner[];
  cnaes: NormalizedCnae[];
};

export type ProviderResult = {
  source: string;
  raw: unknown;
};

export type CompanyApiResponse = {
  data: NormalizedCompany;
  raw: unknown;
  meta: {
    source: string;
    cache: "hit" | "miss" | "stale";
    lastFetchedAt: string | null;
  };
};

export type CompanyRelation = {
  company: NormalizedCompany;
  score: number;
  reasons: string[];
};

export type CompanyRelationsResponse = {
  data: CompanyRelation[];
  meta: {
    cnpj: string;
    limit: number;
    total: number;
  };
};

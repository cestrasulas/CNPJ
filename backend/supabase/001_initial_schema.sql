create extension if not exists pg_trgm;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  cnpj text not null unique,
  legal_name text,
  trade_name text,
  status text,
  opening_date date,
  main_cnae text,
  main_cnae_description text,
  legal_nature text,
  size text,
  capital numeric,
  source text,
  normalized_data jsonb,
  raw_data jsonb,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  street text,
  number text,
  complement text,
  district text,
  city text,
  state text,
  zip_code text,
  country text default 'Brasil',
  created_at timestamptz not null default now()
);

create table if not exists company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type text not null check (type in ('email', 'phone', 'website')),
  value text not null,
  normalized_value text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document_masked text,
  created_at timestamptz not null default now(),
  unique(name, document_masked)
);

create table if not exists company_partners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  role text,
  qualification text,
  entry_date date,
  created_at timestamptz not null default now(),
  unique(company_id, person_id, role)
);

create table if not exists company_cnaes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  description text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(company_id, code)
);

create index if not exists companies_cnpj_idx on companies(cnpj);
create index if not exists companies_legal_name_trgm_idx on companies using gin (legal_name gin_trgm_ops);
create index if not exists companies_trade_name_trgm_idx on companies using gin (trade_name gin_trgm_ops);
create index if not exists company_contacts_normalized_value_idx on company_contacts(normalized_value);
create index if not exists company_cnaes_code_idx on company_cnaes(code);
create index if not exists people_name_trgm_idx on people using gin (name gin_trgm_ops);

alter table companies enable row level security;
alter table company_addresses enable row level security;
alter table company_contacts enable row level security;
alter table people enable row level security;
alter table company_partners enable row level security;
alter table company_cnaes enable row level security;

-- MVP: o backend usa service_role. Nao exponha service_role no frontend.
-- Politicas publicas podem ser adicionadas depois, quando houver autenticacao.

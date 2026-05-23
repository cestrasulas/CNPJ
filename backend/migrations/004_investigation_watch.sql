create table if not exists investigation_watch (
  id uuid primary key default gen_random_uuid(),
  cnpj_basico text not null,
  label text,
  notes text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cnpj_basico)
);

create index if not exists investigation_watch_cnpj_basico_idx on investigation_watch(cnpj_basico);
create index if not exists investigation_watch_last_checked_at_idx on investigation_watch(last_checked_at);

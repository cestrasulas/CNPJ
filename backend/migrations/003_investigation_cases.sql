create table if not exists investigation_case (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists investigation_case_entities (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references investigation_case(id) on delete cascade,
  entity_type text not null,
  entity_value text not null,
  entity_label text,
  created_at timestamptz not null default now(),
  unique (case_id, entity_type, entity_value)
);

create index if not exists investigation_case_status_idx on investigation_case(status);
create index if not exists investigation_case_entities_case_id_idx on investigation_case_entities(case_id);

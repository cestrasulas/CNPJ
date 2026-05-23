create table if not exists investigation_watch_snapshot (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid not null references investigation_watch(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists investigation_watch_event (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid not null references investigation_watch(id) on delete cascade,
  category text not null check (category in ('partners', 'phones', 'emails')),
  change_type text not null check (change_type in ('added', 'removed', 'baseline')),
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists investigation_watch_snapshot_watch_id_idx
  on investigation_watch_snapshot(watch_id, created_at desc);

create index if not exists investigation_watch_event_watch_id_idx
  on investigation_watch_event(watch_id, created_at desc);

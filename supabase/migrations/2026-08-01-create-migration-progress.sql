CREATE TABLE IF NOT EXISTS migration_progress (
  id text primary key default 'b2_migration',
  migrated int default 0,
  failed int default 0,
  total int default 0,
  status text default 'running',
  failures jsonb default '[]',
  updated_at timestamptz default now()
);

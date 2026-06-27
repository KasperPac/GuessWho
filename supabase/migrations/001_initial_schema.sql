-- GuessMate initial schema
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/yjsdslqvpnezpwvlxmvm/sql/new

create table if not exists game_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  theme text not null,
  status text not null default 'draft',
  character_count integer not null default 24,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  game_set_id uuid references game_sets(id) on delete cascade,
  display_name text not null,
  reference_image_url text,
  generated_image_url text,
  attributes jsonb not null default '{}',
  prompt text,
  balance_warnings jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists deck_balance_reports (
  id uuid primary key default gen_random_uuid(),
  game_set_id uuid references game_sets(id) on delete cascade,
  score integer not null,
  is_playable boolean not null,
  report jsonb not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists characters_game_set_id_idx on characters(game_set_id);
create index if not exists deck_balance_reports_game_set_id_idx on deck_balance_reports(game_set_id);

-- RLS: disable for MVP (internal tool, anon key has full access)
alter table game_sets enable row level security;
alter table characters enable row level security;
alter table deck_balance_reports enable row level security;

create policy "Allow all for anon" on game_sets for all using (true) with check (true);
create policy "Allow all for anon" on characters for all using (true) with check (true);
create policy "Allow all for anon" on deck_balance_reports for all using (true) with check (true);

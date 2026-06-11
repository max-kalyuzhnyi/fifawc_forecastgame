-- Live match data from football-data.org

alter table public.matches
  add column fd_match_id bigint unique,
  add column minute int check (minute is null or minute >= 0),
  add column injury_time int check (injury_time is null or injury_time >= 0),
  add column fd_status text,
  add column fd_last_updated timestamptz,
  add column home_lineup jsonb,
  add column away_lineup jsonb;

create index matches_fd_match_id_idx on public.matches (fd_match_id)
  where fd_match_id is not null;

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  event_key text not null,
  type text not null check (
    type in (
      'goal',
      'penalty',
      'own_goal',
      'yellow_card',
      'red_card',
      'yellow_red_card',
      'substitution'
    )
  ),
  minute int not null check (minute >= 0),
  injury_time int check (injury_time is null or injury_time >= 0),
  side text not null check (side in ('home', 'away')),
  player_name text not null,
  secondary_player_name text,
  score_home int check (score_home is null or score_home >= 0),
  score_away int check (score_away is null or score_away >= 0),
  payload jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, event_key)
);

create index match_events_match_id_idx on public.match_events (match_id);
create index match_events_match_minute_idx on public.match_events (match_id, minute);

alter table public.match_events enable row level security;

create policy "Match events viewable by authenticated"
  on public.match_events for select to authenticated using (true);

-- Realtime for live UI updates
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_events'
  ) then
    alter publication supabase_realtime add table public.match_events;
  end if;
end $$;

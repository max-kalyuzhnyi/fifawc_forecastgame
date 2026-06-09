-- FIFA Forecast MVP schema

-- Profiles linked to auth users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin allowlist for result entry and schedule refresh
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  round_key text not null,
  round_display text not null,
  group_name text,
  match_number int,
  kickoff_at timestamptz not null,
  home_team_id uuid references public.teams (id),
  away_team_id uuid references public.teams (id),
  home_team_name text not null,
  away_team_name text not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  home_score int check (home_score is null or home_score >= 0),
  away_score int check (away_score is null or away_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_round_key_idx on public.matches (round_key);
create index matches_kickoff_at_idx on public.matches (kickoff_at);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  round_key text not null,
  home_score int not null check (home_score >= 0),
  away_score int not null check (away_score >= 0),
  scorer_player_id uuid references public.players (id),
  scorer_name text,
  boost_multiplier int not null default 1 check (boost_multiplier in (1, 2, 3)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- One x2 and one x3 boost per user per round
create unique index predictions_one_x2_per_round
  on public.predictions (user_id, round_key)
  where boost_multiplier = 2;

create unique index predictions_one_x3_per_round
  on public.predictions (user_id, round_key)
  where boost_multiplier = 3;

create table public.match_scorers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid references public.players (id),
  scorer_name text not null,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.players enable row level security;
alter table public.predictions enable row level security;
alter table public.match_scorers enable row level security;

-- Profiles
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Admin users: only admins can read the list
create policy "Admins can view admin list"
  on public.admin_users for select to authenticated
  using (public.is_admin());

-- Teams & matches: read-only for authenticated users
create policy "Teams viewable by authenticated"
  on public.teams for select to authenticated using (true);

create policy "Matches viewable by authenticated"
  on public.matches for select to authenticated using (true);

create policy "Admins can update matches"
  on public.matches for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Players
create policy "Players viewable by authenticated"
  on public.players for select to authenticated using (true);

create policy "Admins can manage players"
  on public.players for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Predictions: users manage own predictions before kickoff
create policy "Users can view all predictions"
  on public.predictions for select to authenticated using (true);

create policy "Users can insert own predictions before kickoff"
  on public.predictions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  );

create policy "Users can update own predictions before kickoff"
  on public.predictions for update to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  );

create policy "Users can delete own predictions before kickoff"
  on public.predictions for delete to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  );

-- Match scorers
create policy "Scorers viewable by authenticated"
  on public.match_scorers for select to authenticated using (true);

create policy "Admins can manage scorers"
  on public.match_scorers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Leaderboard view (security invoker so RLS applies)
create or replace view public.leaderboard_base
with (security_invoker = true)
as
select
  p.id as user_id,
  p.display_name,
  count(pr.id) as predictions_count
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
group by p.id, p.display_name;

grant select on public.leaderboard_base to authenticated;

-- Playoff reset: frozen group-stage tiers + per-stage boost budgets

create table if not exists public.playoff_tiers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  group_rank int not null,
  tier int not null check (tier between 1 and 4),
  group_points int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.playoff_tiers enable row level security;

create policy "Playoff tiers are readable by everyone"
  on public.playoff_tiers
  for select
  using (true);

drop index if exists public.predictions_one_boost_per_day;

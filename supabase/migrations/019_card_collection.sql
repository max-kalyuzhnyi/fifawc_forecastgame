-- Panini-style card collection

create type public.card_rarity as enum ('common', 'rare', 'legendary');

create type public.card_pack_reason as enum (
  'daily_picks',
  'scored',
  'boost_scorer',
  'exchange_3',
  'exchange_5'
);

create type public.card_pack_status as enum ('unopened', 'opened');

create type public.card_gift_request_status as enum ('open', 'fulfilled', 'cancelled');

-- Card catalog (~132 national + Legends OTB)
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  is_legend boolean not null default false,
  display_name text not null,
  image_url text,
  rarity public.card_rarity not null default 'common',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_legend_or_player check (
    (is_legend = true and player_id is null)
    or (is_legend = false and player_id is not null)
  )
);

create index cards_team_id_idx on public.cards (team_id) where is_active = true;
create index cards_rarity_idx on public.cards (rarity) where is_active = true;
create unique index cards_player_unique on public.cards (player_id) where player_id is not null;

-- User inventory (count >= 1 means owned; count - 1 = duplicates)
create table public.user_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  count int not null default 1 check (count >= 1),
  first_obtained_at timestamptz not null default now(),
  last_obtained_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create index user_cards_user_id_idx on public.user_cards (user_id);

-- Earned packs (unopened until user opens)
create table public.card_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reason public.card_pack_reason not null,
  size int not null check (size > 0),
  status public.card_pack_status not null default 'unopened',
  source_day date,
  created_at timestamptz not null default now(),
  opened_at timestamptz
);

create index card_packs_user_status_idx on public.card_packs (user_id, status);

create unique index card_packs_daily_grant_unique
  on public.card_packs (user_id, reason, source_day)
  where reason in ('daily_picks', 'scored', 'boost_scorer') and source_day is not null;

-- Gift request board
create table public.card_gift_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  status public.card_gift_request_status not null default 'open',
  fulfilled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

create unique index card_gift_requests_open_unique
  on public.card_gift_requests (requester_user_id, card_id)
  where status = 'open';

create index card_gift_requests_status_idx on public.card_gift_requests (status);

-- Gifts (one-time reveal for recipient)
create table public.card_gifts (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  request_id uuid references public.card_gift_requests (id) on delete set null,
  seen_by_recipient boolean not null default false,
  created_at timestamptz not null default now()
);

create index card_gifts_to_user_unseen_idx
  on public.card_gifts (to_user_id)
  where seen_by_recipient = false;

-- Card art storage for Legends uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-art',
  'card-art',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- RLS
alter table public.cards enable row level security;
alter table public.user_cards enable row level security;
alter table public.card_packs enable row level security;
alter table public.card_gift_requests enable row level security;
alter table public.card_gifts enable row level security;

create policy "Cards viewable by authenticated"
  on public.cards for select to authenticated using (true);

create policy "Admins can manage cards"
  on public.cards for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Users view own inventory"
  on public.user_cards for select to authenticated
  using (auth.uid() = user_id);

create policy "Users manage own inventory"
  on public.user_cards for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users view own packs"
  on public.card_packs for select to authenticated
  using (auth.uid() = user_id);

create policy "Users manage own packs"
  on public.card_packs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Gift requests viewable by authenticated"
  on public.card_gift_requests for select to authenticated using (true);

create policy "Users create own gift requests"
  on public.card_gift_requests for insert to authenticated
  with check (auth.uid() = requester_user_id);

create policy "Users update gift requests"
  on public.card_gift_requests for update to authenticated
  using (auth.uid() = requester_user_id or auth.uid() = fulfilled_by)
  with check (auth.uid() = requester_user_id or auth.uid() = fulfilled_by);

create policy "Recipients view own gifts"
  on public.card_gifts for select to authenticated
  using (auth.uid() = to_user_id or auth.uid() = from_user_id);

create policy "Users create gifts they send"
  on public.card_gifts for insert to authenticated
  with check (auth.uid() = from_user_id);

create policy "Recipients mark gifts seen"
  on public.card_gifts for update to authenticated
  using (auth.uid() = to_user_id) with check (auth.uid() = to_user_id);

-- Realtime
alter publication supabase_realtime add table public.user_cards;
alter publication supabase_realtime add table public.card_packs;
alter publication supabase_realtime add table public.card_gift_requests;
alter publication supabase_realtime add table public.card_gifts;

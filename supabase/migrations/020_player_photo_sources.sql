-- Attribution and review metadata for imported player/card photos

create table public.player_photo_sources (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  card_id uuid references public.cards (id) on delete set null,
  source_provider text not null,
  file_title text not null,
  source_url text not null,
  thumb_url text,
  license_url text,
  author_credit text,
  width int,
  height int,
  score int not null default 0,
  reason_tags text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index player_photo_sources_player_id_idx
  on public.player_photo_sources (player_id);

create unique index player_photo_sources_active_player_unique
  on public.player_photo_sources (player_id)
  where is_active = true;

alter table public.player_photo_sources enable row level security;

create policy "Admins can manage player photo sources"
  on public.player_photo_sources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

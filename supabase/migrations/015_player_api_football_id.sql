-- API-Football player ID for idempotent photo sync + public storage bucket

alter table public.players
  add column if not exists api_football_id integer;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

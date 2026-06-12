alter table public.players
  add column if not exists photo_url text,
  add column if not exists wiki_title text;

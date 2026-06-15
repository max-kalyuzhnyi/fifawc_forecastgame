alter table public.matches
  add column if not exists highlights_source text;

comment on column public.matches.highlights_source is
  'Source of highlights_youtube_id: fifa (official, final) or sporttv (temporary fallback until FIFA publishes).';

update public.matches
set highlights_source = 'fifa'
where highlights_youtube_id is not null
  and highlights_source is null;

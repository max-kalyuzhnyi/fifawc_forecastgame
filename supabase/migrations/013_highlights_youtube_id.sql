alter table public.matches
  add column if not exists highlights_youtube_id text;

comment on column public.matches.highlights_youtube_id is
  'YouTube video ID for official FIFA match highlights embed';

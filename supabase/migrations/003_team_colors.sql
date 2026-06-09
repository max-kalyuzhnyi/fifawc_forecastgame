-- Primary brand color extracted from each team's flag (hex, e.g. #C8102E)
alter table public.teams
  add column if not exists primary_color text;

comment on column public.teams.primary_color is
  'Dominant saturated color from the team flag SVG, used for match UI backgrounds';

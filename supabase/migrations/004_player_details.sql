alter table public.players
  add column position text check (position in ('GK', 'DF', 'MF', 'FW')),
  add column shirt_number int;

-- Remove x3 boost; limit x2 to one per calendar day per user

alter table public.predictions
  drop constraint if exists predictions_boost_multiplier_check;

alter table public.predictions
  add constraint predictions_boost_multiplier_check
  check (boost_multiplier in (1, 2));

drop index if exists public.predictions_one_x2_per_round;
drop index if exists public.predictions_one_x3_per_round;

alter table public.predictions
  add column if not exists boost_day date;

create unique index if not exists predictions_one_boost_per_day
  on public.predictions (user_id, boost_day)
  where boost_multiplier = 2;

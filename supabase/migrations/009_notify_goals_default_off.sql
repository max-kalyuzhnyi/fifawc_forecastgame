-- Goal notifications are opt-in: disable for everyone, new users default off.

update public.profiles
set notify_goals = false;

alter table public.profiles
  alter column notify_goals set default false;

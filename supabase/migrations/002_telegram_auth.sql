-- Telegram Mini App auth: profile fields, trigger update, fresh user slate

-- Wipe existing auth users (cascades profiles, predictions, admin_users)
delete from auth.users;

alter table public.profiles
  add column telegram_id bigint unique,
  add column photo_url text;

-- Auto-create profile on Telegram user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, telegram_id, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'User'),
    (new.raw_user_meta_data ->> 'telegram_id')::bigint,
    new.raw_user_meta_data ->> 'photo_url'
  );
  return new;
end;
$$;

-- Card launch economy tweaks: welcome pack, per-match rewards, request slot limit

-- New pack reasons for welcome and per-match prediction rewards
alter type public.card_pack_reason add value if not exists 'welcome';
alter type public.card_pack_reason add value if not exists 'exact_score';
alter type public.card_pack_reason add value if not exists 'goalscorer';

-- Per-match dedupe for exact score and goalscorer packs
alter table public.card_packs
  add column if not exists source_match_id uuid references public.matches (id) on delete set null;

create index if not exists card_packs_source_match_id_idx
  on public.card_packs (source_match_id)
  where source_match_id is not null;

-- One welcome pack per user ever
create unique index if not exists card_packs_welcome_unique
  on public.card_packs (user_id)
  where reason = 'welcome';

-- One exact_score / goalscorer pack per user per match
create unique index if not exists card_packs_match_grant_unique
  on public.card_packs (user_id, reason, source_match_id)
  where reason in ('exact_score', 'goalscorer') and source_match_id is not null;

-- Enforce at most 3 open card gift requests per user
create or replace function public.enforce_card_gift_request_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  open_count int;
begin
  if new.status <> 'open' then
    return new;
  end if;

  select count(*)::int
  into open_count
  from public.card_gift_requests
  where requester_user_id = new.requester_user_id
    and status = 'open'
    and (tg_op = 'INSERT' or id <> new.id);

  if open_count >= 3 then
    raise exception 'Maximum of 3 open card requests allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists card_gift_requests_limit_trigger on public.card_gift_requests;

create trigger card_gift_requests_limit_trigger
  before insert or update on public.card_gift_requests
  for each row
  execute function public.enforce_card_gift_request_limit();

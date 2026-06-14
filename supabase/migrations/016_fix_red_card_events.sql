-- Fix red cards mislabeled as yellow_card when synced before bookingEventType
-- handled football-data.org "RED" values. Also dedupe duplicate red rows for
-- the same player/match (minute fluctuation between syncs).

with ranked as (
  select
    id,
    row_number() over (
      partition by match_id, player_name
      order by created_at desc
    ) as rn
  from public.match_events
  where payload->>'card' = 'RED'
)
delete from public.match_events
where id in (
  select id
  from ranked
  where rn > 1
);

update public.match_events
set type = 'red_card'
where payload->>'card' = 'RED'
  and type <> 'red_card';

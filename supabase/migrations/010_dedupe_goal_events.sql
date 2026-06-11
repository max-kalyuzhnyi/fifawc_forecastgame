-- Remove duplicate goal events caused by score corrections from football-data.org.
-- Keep the newest row per (match, type, minute, injury_time, player).

with ranked as (
  select
    id,
    row_number() over (
      partition by
        match_id,
        type,
        minute,
        coalesce(injury_time, 0),
        player_name
      order by created_at desc
    ) as rn
  from public.match_events
  where type in ('goal', 'penalty', 'own_goal')
)
delete from public.match_events
where id in (
  select id
  from ranked
  where rn > 1
);

-- Align event_key with sync-live-matches (score excluded from key).
update public.match_events
set event_key =
  'goal-'
  || minute::text
  || '-'
  || coalesce(injury_time, 0)::text
  || '-'
  || trim(
    both '-'
    from regexp_replace(lower(player_name), '[^a-z0-9]+', '-', 'g')
  )
where type in ('goal', 'penalty', 'own_goal');

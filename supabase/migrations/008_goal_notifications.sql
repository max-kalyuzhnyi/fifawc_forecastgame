-- Goal notifications: deduplication + pg_cron job.
-- Before running: set vault secret via Supabase Dashboard → Project Settings → Vault:
--   goals_edge_url = https://<project-ref>.supabase.co/functions/v1/send-goal-notifications
-- (cron_secret from 006_cron_sync.sql is reused)

alter table public.match_events
  add column if not exists notified_at timestamptz;

update public.match_events
set notified_at = now()
where notified_at is null;

create index if not exists match_events_unnotified_goals_idx
  on public.match_events (created_at)
  where type in ('goal', 'penalty', 'own_goal')
    and notified_at is null;

create or replace function public.invoke_send_goal_notifications()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  edge_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into edge_url
  from vault.decrypted_secrets
  where name = 'goals_edge_url'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if edge_url is null or cron_secret is null then
    raise notice 'send-goal-notifications cron skipped: vault secrets goals_edge_url / cron_secret not configured';
    return null;
  end if;

  select net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := '{}'::jsonb
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_send_goal_notifications() from public;
grant execute on function public.invoke_send_goal_notifications() to postgres;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'send-goal-notifications'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'send-goal-notifications',
  '30 seconds',
  $$select public.invoke_send_goal_notifications();$$
);

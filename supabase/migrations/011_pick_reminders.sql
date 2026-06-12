-- Pick reminders: notify users 3 hours before kickoff if they have no prediction.
-- Before running: set vault secret via Supabase Dashboard → Project Settings → Vault:
--   pick_reminders_edge_url = https://<project-ref>.supabase.co/functions/v1/send-pick-reminders
-- (cron_secret from 006_cron_sync.sql is reused)

alter table public.matches
  add column if not exists pick_reminder_sent_at timestamptz;

create index if not exists matches_pick_reminder_pending_idx
  on public.matches (kickoff_at)
  where pick_reminder_sent_at is null
    and status = 'scheduled';

create or replace function public.invoke_send_pick_reminders()
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
  where name = 'pick_reminders_edge_url'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if edge_url is null or cron_secret is null then
    raise notice 'send-pick-reminders cron skipped: vault secrets pick_reminders_edge_url / cron_secret not configured';
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

revoke all on function public.invoke_send_pick_reminders() from public;
grant execute on function public.invoke_send_pick_reminders() to postgres;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'send-pick-reminders'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'send-pick-reminders',
  '*/5 * * * *',
  $$select public.invoke_send_pick_reminders();$$
);

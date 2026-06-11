-- pg_cron job to invoke sync-live-matches edge function every 20 seconds.
-- Before running: set vault secrets via Supabase Dashboard → Project Settings → Vault:
--   sync_edge_url  = https://<project-ref>.supabase.co/functions/v1/sync-live-matches
--   cron_secret    = random secret (same value as CRON_SECRET edge function secret)

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_sync_live_matches()
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
  where name = 'sync_edge_url'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if edge_url is null or cron_secret is null then
    raise notice 'sync-live-matches cron skipped: vault secrets sync_edge_url / cron_secret not configured';
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

revoke all on function public.invoke_sync_live_matches() from public;
grant execute on function public.invoke_sync_live_matches() to postgres;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'sync-live-matches'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'sync-live-matches',
  '20 seconds',
  $$select public.invoke_sync_live_matches();$$
);

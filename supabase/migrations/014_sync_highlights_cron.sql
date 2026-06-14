-- pg_cron job to invoke sync-highlights edge function every hour.
-- Before running: set vault secret via Supabase Dashboard → Project Settings → Vault:
--   sync_highlights_edge_url = https://<project-ref>.supabase.co/functions/v1/sync-highlights
-- Reuses existing cron_secret vault entry from sync-live-matches setup.

create or replace function public.invoke_sync_highlights()
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
  where name = 'sync_highlights_edge_url'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if edge_url is null or cron_secret is null then
    raise notice 'sync-highlights cron skipped: vault secrets sync_highlights_edge_url / cron_secret not configured';
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

revoke all on function public.invoke_sync_highlights() from public;
grant execute on function public.invoke_sync_highlights() to postgres;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'sync-highlights'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'sync-highlights',
  '0 * * * *',
  $$select public.invoke_sync_highlights();$$
);

-- Recordings now persist through review (see the removed audio_path
-- clear in useSubmitReviewMutation), but the app's privacy commitment
-- (see 20260812060319's purge_after comment) still says every recording
-- has a hard 7-day lifespan from when the attempt was CREATED —
-- whether it's ever been reviewed or not, and that clock never resets
-- once a review is confirmed. purge_after already IS created_at + 7
-- days (set once at insert, in 20260812060319, and never touched by any
-- update since), so it's already the exact anchor this needs — this
-- migration just adds the thing that actually acts on it.
--
-- Actually deleting a Storage object requires the Storage API (deleting
-- the storage.objects row alone leaves the underlying blob orphaned), so
-- this can't be pure SQL — it calls the new purge-expired-recordings
-- Edge Function (which uses the service-role client, same pattern as
-- every other function in supabase/functions/) once a day via pg_cron +
-- pg_net.
--
-- The function has no human caller (nothing to send a user JWT), so
-- verify_jwt is disabled for it (see config.toml) and it's guarded by a
-- shared secret instead, sent as the x-cron-secret header below.
--
-- SETUP REQUIRED AFTER THIS MIGRATION RUNS (deliberately NOT done here —
-- secrets don't belong in a committed migration file):
--
--   1. Deploy the function and set its secret:
--        supabase functions deploy purge-expired-recordings
--        supabase secrets set CRON_SECRET=<a long random string you generate>
--
--   2. Store the same two values in Postgres Vault (run once, in the
--      Supabase SQL editor against your PRODUCTION project — NOT as a
--      migration, so they never end up in git history):
--        select vault.create_secret('https://syhivjzcgmxihuvpqshh.supabase.co', 'project_url');
--        select vault.create_secret('<the same random string from step 1>', 'cron_secret');
--
--   For LOCAL dev, the postgres container can't reach 127.0.0.1:54321
--      (that's itself, not the edge-runtime container) — if you want to
--      test the cron firing locally rather than just invoking the
--      function directly, set the local vault 'project_url' secret to
--      "http://kong:8000" instead (the Docker-internal gateway alias),
--      re-run `select vault.create_secret(...)` locally, and re-run
--      `select cron.schedule(...)` below after changing it — cron.schedule
--      with the same job name below UPDATES the existing job rather than
--      duplicating it, so it's safe to re-run.
create extension if not exists pg_cron;
create extension if not exists pg_net;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
-- Runs daily at 18:00 UTC = 2:00 AM Asia/Manila — quiet hours, well
-- outside when a teacher would plausibly be actively reviewing.
select cron.schedule(
               'purge-expired-recordings-daily',
               '0 18 * * *',
               $$
                   select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1) || '/functions/v1/purge-expired-recordings',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
        ),
        body := '{}'::jsonb
    );
$$
);
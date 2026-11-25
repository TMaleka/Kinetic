-- Schedules the daily reminder emails. Run once in the Supabase SQL editor AFTER:
--   1. supabase functions deploy send-reminders --no-verify-jwt
--   2. supabase secrets set RESEND_API_KEY=... APP_URL=https://kinetic-flax-nine.vercel.app CRON_SECRET=<long random string>
-- Replace <CRON_SECRET> below with the same random string. 04:00 UTC = 06:00 in South Africa.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('kinetic-daily-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'kinetic-daily-reminders');
SELECT cron.schedule(
  'kinetic-daily-reminders',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://klqsedtgrckcxybhxxme.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);

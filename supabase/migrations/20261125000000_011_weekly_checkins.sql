-- Weekly client check-ins, trainer replies, and email-reminder opt-out.
CREATE TABLE IF NOT EXISTS public.weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  week_start date NOT NULL,
  energy smallint NOT NULL CHECK (energy BETWEEN 1 AND 5),
  sleep smallint NOT NULL CHECK (sleep BETWEEN 1 AND 5),
  stress smallint NOT NULL CHECK (stress BETWEEN 1 AND 5),
  soreness smallint NOT NULL CHECK (soreness BETWEEN 1 AND 5),
  training smallint NOT NULL CHECK (training BETWEEN 1 AND 5),
  wins text CHECK (char_length(wins) <= 2000),
  struggles text CHECK (char_length(struggles) <= 2000),
  body_weight numeric(5,1),
  trainer_reply text CHECK (char_length(trainer_reply) <= 2000),
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, week_start)
);

CREATE INDEX IF NOT EXISTS weekly_checkins_client_week_idx ON public.weekly_checkins (client_id, week_start DESC);
CREATE INDEX IF NOT EXISTS weekly_checkins_trainer_week_idx ON public.weekly_checkins (trainer_id, week_start DESC);

ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkins_select" ON public.weekly_checkins;
CREATE POLICY "checkins_select" ON public.weekly_checkins
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_client_links tcl WHERE tcl.client_id = weekly_checkins.client_id AND tcl.trainer_id = auth.uid() AND tcl.status = 'active')
  );

DROP POLICY IF EXISTS "checkins_insert_own" ON public.weekly_checkins;
CREATE POLICY "checkins_insert_own" ON public.weekly_checkins
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() AND trainer_reply IS NULL);

-- Clients may edit their own answers; the reply columns are only written via reply_to_checkin().
DROP POLICY IF EXISTS "checkins_update_own" ON public.weekly_checkins;
CREATE POLICY "checkins_update_own" ON public.weekly_checkins
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_checkin_reply()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('kinetic.replying', true) IS DISTINCT FROM 'on' THEN
    NEW.trainer_reply := OLD.trainer_reply;
    NEW.replied_at := OLD.replied_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS weekly_checkins_protect_reply ON public.weekly_checkins;
CREATE TRIGGER weekly_checkins_protect_reply
  BEFORE UPDATE ON public.weekly_checkins
  FOR EACH ROW EXECUTE FUNCTION public.protect_checkin_reply();

CREATE OR REPLACE FUNCTION public.reply_to_checkin(p_checkin_id uuid, p_reply text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM weekly_checkins wc
    JOIN trainer_client_links tcl ON tcl.client_id = wc.client_id AND tcl.trainer_id = auth.uid() AND tcl.status = 'active'
    WHERE wc.id = p_checkin_id
  ) THEN
    RAISE EXCEPTION 'Check-in not found';
  END IF;
  PERFORM set_config('kinetic.replying', 'on', true);
  UPDATE weekly_checkins
    SET trainer_reply = NULLIF(trim(p_reply), ''), replied_at = now()
    WHERE id = p_checkin_id;
  PERFORM set_config('kinetic.replying', 'off', true);
END $$;

REVOKE ALL ON FUNCTION public.reply_to_checkin(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.reply_to_checkin(uuid, text) TO authenticated;

-- Lets clients turn off reminder emails (used by the send-reminders function).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_reminders boolean NOT NULL DEFAULT true;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'workout_reminder', 'workout_completed', 'workout_missed', 'measurement_logged',
  'photo_uploaded', 'client_linked', 'plan_assigned', 'goal_updated',
  'checkin_due', 'checkin_submitted', 'checkin_reply'
));

-- One reminder per session / check-in week, even if two devices create it at once.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_reminder_once_idx
  ON public.notifications (user_id, type, (COALESCE(metadata->>'session_id', metadata->>'week_start')))
  WHERE type IN ('workout_reminder', 'workout_missed', 'checkin_due');

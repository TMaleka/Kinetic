-- Security fixes for trainer-client links, plus check-in weight sync and reminder email log.

-- 1. Links are created only by accept_invitation(). Previously any user could insert a link
--    naming themselves as trainer and read that client's data.
DROP POLICY IF EXISTS "links_insert_trainer" ON public.trainer_client_links;

-- 2. Only the invited client can accept an invitation for themselves.
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_invitation_id uuid,
  p_client_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_invitation record;
BEGIN
  IF p_client_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE id = p_invitation_id
  AND status = 'pending'
  AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF lower(v_invitation.email) != lower((SELECT email FROM public.profiles WHERE id = p_client_id)) THEN
    RETURN false;
  END IF;

  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = p_client_id
  WHERE id = p_invitation_id;

  PERFORM set_config('kinetic.linking', 'on', true);
  INSERT INTO public.trainer_client_links (trainer_id, client_id, status)
  VALUES (v_invitation.trainer_id, p_client_id, 'active')
  ON CONFLICT (trainer_id, client_id) DO UPDATE
  SET status = 'active', started_at = CURRENT_DATE;
  PERFORM set_config('kinetic.linking', 'off', true);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Trainers may edit goals or deactivate a link, but not reactivate it or change who it links.
CREATE OR REPLACE FUNCTION public.protect_trainer_client_link()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('kinetic.linking', true) IS DISTINCT FROM 'on' THEN
    IF NEW.trainer_id IS DISTINCT FROM OLD.trainer_id OR NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      RAISE EXCEPTION 'A link''s trainer and client cannot be changed';
    END IF;
    IF OLD.status = 'inactive' AND NEW.status = 'active' THEN
      RAISE EXCEPTION 'Send a new invitation to reconnect with this client';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trainer_client_links_protect ON public.trainer_client_links;
CREATE TRIGGER trainer_client_links_protect
  BEFORE UPDATE ON public.trainer_client_links
  FOR EACH ROW EXECUTE FUNCTION public.protect_trainer_client_link();

-- 4. Check-in weight is mirrored into one measurement row so edits update progress charts.
ALTER TABLE public.weekly_checkins
  ADD COLUMN IF NOT EXISTS measurement_id uuid REFERENCES public.measurements(id) ON DELETE SET NULL;

-- 5. Delivery log for reminder emails. Only the service role (send-reminders) can use it.
CREATE TABLE IF NOT EXISTS public.reminder_log (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, ref)
);
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

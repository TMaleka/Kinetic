/*
# KineTic — Client Invitations

## Overview
Adds an invitation system for trainers to onboard clients via email or invite codes.
Trainers send invitations, clients accept them to establish trainer-client links.

## New Table

**invitations** — trainer-sent invitations to clients with email, status, and expiry
- trainer_id: who sent the invitation
- email: client email address
- invite_code: unique code for manual entry
- status: pending, accepted, expired
- expires_at: when the invitation expires (7 days default)
- accepted_at: when client accepted
- accepted_by: which profile accepted the invitation

## Security
- RLS enabled on invitations table.
- Trainers can create and view their own invitations.
- Clients can view invitations sent to their email.
- Only pending invitations can be accepted.
*/

-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invitations_trainer ON public.invitations(trainer_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- Trainers can create invitations
DROP POLICY IF EXISTS "invitations_insert_trainer" ON public.invitations;
CREATE POLICY "invitations_insert_trainer" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Trainers can view their own invitations
DROP POLICY IF EXISTS "invitations_select_trainer" ON public.invitations;
CREATE POLICY "invitations_select_trainer" ON public.invitations
  FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

-- Clients can view invitations sent to their email
DROP POLICY IF EXISTS "invitations_select_client" ON public.invitations;
CREATE POLICY "invitations_select_client" ON public.invitations
  FOR SELECT TO authenticated
  USING (email IN (
    SELECT email FROM public.profiles WHERE id = auth.uid()
  ));

-- Trainers can update their own invitations (cancel, etc.)
DROP POLICY IF EXISTS "invitations_update_trainer" ON public.invitations;
CREATE POLICY "invitations_update_trainer" ON public.invitations
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Clients can accept pending invitations sent to their email
DROP POLICY IF EXISTS "invitations_accept_client" ON public.invitations;
CREATE POLICY "invitations_accept_client" ON public.invitations
  FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
    AND expires_at > now()
  )
  WITH CHECK (
    status = 'accepted'
    AND accepted_by = auth.uid()
    AND accepted_at = now()
  );

-- ============================================================
-- FUNCTION: Generate Invite Code
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text AS $$
BEGIN
  RETURN upper(substring(encode(gen_random_bytes(4), 'base64'), 1, 6));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Create Invitation
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_trainer_id uuid,
  p_email text
)
RETURNS uuid AS $$
DECLARE
  v_invite_code text;
  v_invitation_id uuid;
BEGIN
  -- Check if there's already a pending invitation for this email
  IF EXISTS (
    SELECT 1 FROM public.invitations
    WHERE trainer_id = p_trainer_id
    AND email = p_email
    AND status = 'pending'
    AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Pending invitation already exists for this email';
  END IF;

  -- Generate unique code
  v_invite_code := public.generate_invite_code();
  WHILE EXISTS (SELECT 1 FROM public.invitations WHERE invite_code = v_invite_code) LOOP
    v_invite_code := public.generate_invite_code();
  END LOOP;

  -- Create invitation
  INSERT INTO public.invitations (trainer_id, email, invite_code)
  VALUES (p_trainer_id, lower(p_email), v_invite_code)
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Accept Invitation
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_invitation_id uuid,
  p_client_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_invitation record;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE id = p_invitation_id
  AND status = 'pending'
  AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Verify email matches
  IF v_invitation.email != (SELECT email FROM public.profiles WHERE id = p_client_id) THEN
    RETURN false;
  END IF;

  -- Update invitation
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = p_client_id
  WHERE id = p_invitation_id;

  -- Create trainer-client link
  INSERT INTO public.trainer_client_links (trainer_id, client_id, status)
  VALUES (v_invitation.trainer_id, p_client_id, 'active')
  ON CONFLICT (trainer_id, client_id) DO UPDATE
  SET status = 'active', started_at = CURRENT_DATE;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Expire Old Invitations
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE public.invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

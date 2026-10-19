/*
# Fixes found during app audit

1. profiles.onboarding_completed — used by the app but only documented in README.
2. Trainers can update goals of their linked clients (needed to confirm/adjust/reject
   goals from the trainer dashboard).
3. Trainers and linked clients can create notifications for each other
   (plan assigned -> client, workout completed -> trainer). Previously only
   self-inserts were allowed, so notifications were never created.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

DROP POLICY IF EXISTS "client_goals_update_trainer" ON public.client_goals;
CREATE POLICY "client_goals_update_trainer" ON public.client_goals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = client_goals.client_id AND tcl.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = client_goals.client_id AND tcl.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "notifications_insert_linked" ON public.notifications;
CREATE POLICY "notifications_insert_linked" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.status = 'active'
      AND (
        (tcl.trainer_id = auth.uid() AND tcl.client_id = notifications.user_id)
        OR (tcl.client_id = auth.uid() AND tcl.trainer_id = notifications.user_id)
      )
    )
  );

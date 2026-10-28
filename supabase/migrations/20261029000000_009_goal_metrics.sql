/*
# Goal-specific progress metrics

Lift weights, run times, body fat, circumferences, mobility/pain scores and
health readings logged against a client's goal. Body weight and waist stay in
public.measurements.
*/
CREATE TABLE IF NOT EXISTS public.goal_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric text NOT NULL,
  value numeric NOT NULL,
  unit text,
  notes text,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  logged_by uuid REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_metrics_client ON public.goal_metrics(client_id, metric, logged_at);

ALTER TABLE public.goal_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goal_metrics_select" ON public.goal_metrics;
CREATE POLICY "goal_metrics_select" ON public.goal_metrics
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_client_links tcl WHERE tcl.client_id = goal_metrics.client_id AND tcl.trainer_id = auth.uid())
  );

DROP POLICY IF EXISTS "goal_metrics_insert" ON public.goal_metrics;
CREATE POLICY "goal_metrics_insert" ON public.goal_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_client_links tcl WHERE tcl.client_id = goal_metrics.client_id AND tcl.trainer_id = auth.uid())
  );

DROP POLICY IF EXISTS "goal_metrics_delete" ON public.goal_metrics;
CREATE POLICY "goal_metrics_delete" ON public.goal_metrics
  FOR DELETE TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_client_links tcl WHERE tcl.client_id = goal_metrics.client_id AND tcl.trainer_id = auth.uid())
  );

-- Allow "goal_updated" notifications when a client changes their goal.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'workout_reminder', 'workout_completed', 'workout_missed', 'measurement_logged',
  'photo_uploaded', 'client_linked', 'plan_assigned', 'goal_updated'
));

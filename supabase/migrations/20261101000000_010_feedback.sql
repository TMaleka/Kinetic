-- In-app beta feedback. Read submissions in Supabase Table Editor → feedback.
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('bug', 'idea', 'other')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  page text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback (created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users submit their own feedback" ON public.feedback;
CREATE POLICY "Users submit their own feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read their own feedback" ON public.feedback;
CREATE POLICY "Users read their own feedback" ON public.feedback
  FOR SELECT TO authenticated USING (user_id = auth.uid());

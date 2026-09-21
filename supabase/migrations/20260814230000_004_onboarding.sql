/*
# Onboarding Schema for KineTic Platform

## Overview
Adds tables for client onboarding system and trainer goal review process.

## New Tables

1. **client_goals** — stores client fitness goals submitted during onboarding
2. **goal_reviews** — stores trainer responses to client goal requests

## Security
- RLS enabled on all tables
- Clients can only see their own goals and reviews
- Trainers can see goals from their linked clients
- Trainers can create reviews for their clients' goals
*/

-- ============================================================
-- CLIENT GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal text NOT NULL,
  starting_weight numeric,
  target_weight numeric,
  timeline text,
  additional_targets text,
  starting_height numeric,
  activity_level text,
  injuries text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'adjusted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.client_goals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_client_goals_client ON public.client_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_status ON public.client_goals(status);

-- Clients can see their own goals
DROP POLICY IF EXISTS "client_goals_select_client" ON public.client_goals;
CREATE POLICY "client_goals_select_client" ON public.client_goals
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

-- Trainers can see goals from their linked clients
DROP POLICY IF EXISTS "client_goals_select_trainer" ON public.client_goals;
CREATE POLICY "client_goals_select_trainer" ON public.client_goals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = client_goals.client_id AND tcl.trainer_id = auth.uid()
    )
  );

-- Clients can insert their own goals
DROP POLICY IF EXISTS "client_goals_insert_client" ON public.client_goals;
CREATE POLICY "client_goals_insert_client" ON public.client_goals
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Clients can update their own goals (only if pending)
DROP POLICY IF EXISTS "client_goals_update_client" ON public.client_goals;
CREATE POLICY "client_goals_update_client" ON public.client_goals
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid() AND status = 'pending')
  WITH CHECK (client_id = auth.uid() AND status = 'pending');

-- ============================================================
-- GOAL REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.goal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.client_goals(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('confirm', 'adjust', 'reject')),
  adjusted_goal text,
  feedback text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.goal_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_goal_reviews_goal ON public.goal_reviews(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_reviews_trainer ON public.goal_reviews(trainer_id);
CREATE INDEX IF NOT EXISTS idx_goal_reviews_client ON public.goal_reviews(client_id);

-- Trainers can see reviews they created
DROP POLICY IF EXISTS "goal_reviews_select_trainer" ON public.goal_reviews;
CREATE POLICY "goal_reviews_select_trainer" ON public.goal_reviews
  FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

-- Clients can see reviews for their goals
DROP POLICY IF EXISTS "goal_reviews_select_client" ON public.goal_reviews;
CREATE POLICY "goal_reviews_select_client" ON public.goal_reviews
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

-- Trainers can insert reviews for their clients' goals
DROP POLICY IF EXISTS "goal_reviews_insert_trainer" ON public.goal_reviews;
CREATE POLICY "goal_reviews_insert_trainer" ON public.goal_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    trainer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = goal_reviews.client_id AND tcl.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- UPDATED_AT TRIGGER FOR NEW TABLES
-- ============================================================
DROP TRIGGER IF EXISTS client_goals_updated_at ON public.client_goals;
CREATE TRIGGER client_goals_updated_at BEFORE UPDATE ON public.client_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS goal_reviews_updated_at ON public.goal_reviews;
CREATE TRIGGER goal_reviews_updated_at BEFORE UPDATE ON public.goal_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
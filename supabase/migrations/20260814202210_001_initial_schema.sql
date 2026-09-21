/*
# CoachHub — Initial Schema for Trainer & Client Platform

## Overview
Creates the full data model for a personal-training platform with two user roles
(trainers and clients) linked through Supabase Auth. Trainers manage clients,
assign workout plans, and track progress. Clients log workouts and measurements.

## New Tables

1. **profiles** — extends auth.users with role (trainer/client), name, avatar
2. **trainer_client_links** — links a client to their trainer (many clients → one trainer)
3. **workout_plans** — a named program assigned to a client by their trainer
4. **plan_days** — a day within a workout plan (e.g. "Day 1: Push")
5. **plan_exercises** — exercises within a plan day, with target sets/reps/weight
6. **workout_sessions** — a client's actual workout on a given day (scheduled or completed)
7. **session_logs** — per-set logs (set number, reps, weight, completed) within a session
8. **measurements** — body weight and body-part measurements over time
9. **progress_photos** — progress photo URLs with timestamps
10. **achievements** — milestone badges earned by clients
11. **activity_timeline** — auto-generated events for each client (workout completed, measurement logged, etc.)

## Security
- RLS enabled on every table.
- Trainers can read/write data for clients linked to them.
- Clients can read their own data and write their own logs/measurements/sessions.
- All policies use auth.uid() and ownership checks through the profile + link tables.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('trainer', 'client')),
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  phone text,
  bio text,
  location text,
  specialization text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read profiles (trainers need to see client names)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Users can update only their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Users can insert their own profile row
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- TRAINER-CLIENT LINKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trainer_client_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  goals text,
  started_at date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (trainer_id, client_id)
);
ALTER TABLE public.trainer_client_links ENABLE ROW LEVEL SECURITY;

-- Trainers can see all their client links
DROP POLICY IF EXISTS "links_select_trainer" ON public.trainer_client_links;
CREATE POLICY "links_select_trainer" ON public.trainer_client_links
  FOR SELECT TO authenticated
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
  );

-- Only trainers can insert/update links for themselves
DROP POLICY IF EXISTS "links_insert_trainer" ON public.trainer_client_links;
CREATE POLICY "links_insert_trainer" ON public.trainer_client_links
  FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS "links_update_trainer" ON public.trainer_client_links;
CREATE POLICY "links_update_trainer" ON public.trainer_client_links
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS "links_delete_trainer" ON public.trainer_client_links;
CREATE POLICY "links_delete_trainer" ON public.trainer_client_links
  FOR DELETE TO authenticated
  USING (trainer_id = auth.uid());

-- ============================================================
-- WORKOUT PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select" ON public.workout_plans;
CREATE POLICY "plans_select" ON public.workout_plans
  FOR SELECT TO authenticated
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
  );

DROP POLICY IF EXISTS "plans_insert" ON public.workout_plans;
CREATE POLICY "plans_insert" ON public.workout_plans
  FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS "plans_update" ON public.workout_plans;
CREATE POLICY "plans_update" ON public.workout_plans
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS "plans_delete" ON public.workout_plans;
CREATE POLICY "plans_delete" ON public.workout_plans
  FOR DELETE TO authenticated
  USING (trainer_id = auth.uid());

-- ============================================================
-- PLAN DAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Day',
  day_order int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_days_select" ON public.plan_days;
CREATE POLICY "plan_days_select" ON public.plan_days
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans p
      WHERE p.id = plan_days.plan_id
      AND (p.trainer_id = auth.uid() OR p.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "plan_days_insert" ON public.plan_days;
CREATE POLICY "plan_days_insert" ON public.plan_days
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans p
      WHERE p.id = plan_days.plan_id AND p.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "plan_days_update" ON public.plan_days;
CREATE POLICY "plan_days_update" ON public.plan_days
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans p
      WHERE p.id = plan_days.plan_id AND p.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans p
      WHERE p.id = plan_days.plan_id AND p.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "plan_days_delete" ON public.plan_days;
CREATE POLICY "plan_days_delete" ON public.plan_days
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans p
      WHERE p.id = plan_days.plan_id AND p.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- PLAN EXERCISES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id uuid NOT NULL REFERENCES public.plan_days(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_sets int NOT NULL DEFAULT 3,
  target_reps int NOT NULL DEFAULT 10,
  target_weight numeric DEFAULT 0,
  rest_seconds int DEFAULT 60,
  notes text,
  exercise_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_exercises_select" ON public.plan_exercises;
CREATE POLICY "plan_exercises_select" ON public.plan_exercises
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.workout_plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_exercises.plan_day_id
      AND (p.trainer_id = auth.uid() OR p.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "plan_exercises_insert" ON public.plan_exercises;
CREATE POLICY "plan_exercises_insert" ON public.plan_exercises
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.workout_plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_exercises.plan_day_id AND p.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "plan_exercises_update" ON public.plan_exercises;
CREATE POLICY "plan_exercises_update" ON public.plan_exercises
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.workout_plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_exercises.plan_day_id AND p.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.workout_plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_exercises.plan_day_id AND p.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "plan_exercises_delete" ON public.plan_exercises;
CREATE POLICY "plan_exercises_delete" ON public.plan_exercises
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.workout_plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_exercises.plan_day_id AND p.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- WORKOUT SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id uuid REFERENCES public.plan_days(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Workout',
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed')),
  feeling int CHECK (feeling >= 1 AND feeling <= 5),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_client ON public.workout_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON public.workout_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON public.workout_sessions(status);

DROP POLICY IF EXISTS "sessions_select" ON public.workout_sessions;
CREATE POLICY "sessions_select" ON public.workout_sessions
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR trainer_id = auth.uid());

DROP POLICY IF EXISTS "sessions_insert" ON public.workout_sessions;
CREATE POLICY "sessions_insert" ON public.workout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() OR trainer_id = auth.uid());

DROP POLICY IF EXISTS "sessions_update" ON public.workout_sessions;
CREATE POLICY "sessions_update" ON public.workout_sessions
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR trainer_id = auth.uid())
  WITH CHECK (client_id = auth.uid() OR trainer_id = auth.uid());

DROP POLICY IF EXISTS "sessions_delete" ON public.workout_sessions;
CREATE POLICY "sessions_delete" ON public.workout_sessions
  FOR DELETE TO authenticated
  USING (client_id = auth.uid() OR trainer_id = auth.uid());

-- ============================================================
-- SESSION LOGS (per-set)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  set_number int NOT NULL,
  reps int,
  weight numeric,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_session_logs_session ON public.session_logs(session_id);

DROP POLICY IF EXISTS "session_logs_select" ON public.session_logs;
CREATE POLICY "session_logs_select" ON public.session_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_logs.session_id
      AND (s.client_id = auth.uid() OR s.trainer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_logs_insert" ON public.session_logs;
CREATE POLICY "session_logs_insert" ON public.session_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_logs.session_id
      AND (s.client_id = auth.uid() OR s.trainer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_logs_update" ON public.session_logs;
CREATE POLICY "session_logs_update" ON public.session_logs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_logs.session_id
      AND (s.client_id = auth.uid() OR s.trainer_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_logs.session_id
      AND (s.client_id = auth.uid() OR s.trainer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_logs_delete" ON public.session_logs;
CREATE POLICY "session_logs_delete" ON public.session_logs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_logs.session_id
      AND (s.client_id = auth.uid() OR s.trainer_id = auth.uid())
    )
  );

-- ============================================================
-- MEASUREMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body_weight numeric,
  chest numeric,
  waist numeric,
  hips numeric,
  left_arm numeric,
  right_arm numeric,
  left_thigh numeric,
  right_thigh numeric,
  left_calf numeric,
  right_calf numeric,
  notes text,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_measurements_client ON public.measurements(client_id);
CREATE INDEX IF NOT EXISTS idx_measurements_date ON public.measurements(logged_at);

DROP POLICY IF EXISTS "measurements_select" ON public.measurements;
CREATE POLICY "measurements_select" ON public.measurements
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = measurements.client_id AND tcl.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "measurements_insert" ON public.measurements;
CREATE POLICY "measurements_insert" ON public.measurements
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = measurements.client_id AND tcl.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "measurements_update" ON public.measurements;
CREATE POLICY "measurements_update" ON public.measurements
  FOR UPDATE TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = measurements.client_id AND tcl.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = measurements.client_id AND tcl.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "measurements_delete" ON public.measurements;
CREATE POLICY "measurements_delete" ON public.measurements
  FOR DELETE TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = measurements.client_id AND tcl.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- PROGRESS PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  photo_type text CHECK (photo_type IN ('front', 'side', 'back', 'other')) DEFAULT 'front',
  taken_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_progress_photos_client ON public.progress_photos(client_id);

DROP POLICY IF EXISTS "photos_select" ON public.progress_photos;
CREATE POLICY "photos_select" ON public.progress_photos
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = progress_photos.client_id AND tcl.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "photos_insert" ON public.progress_photos;
CREATE POLICY "photos_insert" ON public.progress_photos
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "photos_delete" ON public.progress_photos;
CREATE POLICY "photos_delete" ON public.progress_photos
  FOR DELETE TO authenticated
  USING (client_id = auth.uid());

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  earned_at timestamptz DEFAULT now()
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_achievements_client ON public.achievements(client_id);

DROP POLICY IF EXISTS "achievements_select" ON public.achievements;
CREATE POLICY "achievements_select" ON public.achievements
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = achievements.client_id AND tcl.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "achievements_insert" ON public.achievements;
CREATE POLICY "achievements_insert" ON public.achievements
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "achievements_delete" ON public.achievements;
CREATE POLICY "achievements_delete" ON public.achievements
  FOR DELETE TO authenticated
  USING (client_id = auth.uid());

-- ============================================================
-- ACTIVITY TIMELINE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.activity_timeline ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_client ON public.activity_timeline(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_timeline(created_at DESC);

DROP POLICY IF EXISTS "activity_select" ON public.activity_timeline;
CREATE POLICY "activity_select" ON public.activity_timeline
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR trainer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trainer_client_links tcl
      WHERE tcl.client_id = activity_timeline.client_id AND tcl.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "activity_insert" ON public.activity_timeline;
CREATE POLICY "activity_insert" ON public.activity_timeline
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() OR trainer_id = auth.uid());

DROP POLICY IF EXISTS "activity_delete" ON public.activity_timeline;
CREATE POLICY "activity_delete" ON public.activity_timeline
  FOR DELETE TO authenticated
  USING (client_id = auth.uid() OR trainer_id = auth.uid());

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS workout_plans_updated_at ON public.workout_plans;
CREATE TRIGGER workout_plans_updated_at BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (NEW.id, NEW.email, 'client', COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

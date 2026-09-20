import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
  // store session in localStorage so it survives reloads
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

export type Profile = {
  id: string
  email: string
  role: 'trainer' | 'client'
  full_name: string
  avatar_url: string | null
  phone: string | null
  bio: string | null
  location: string | null
  specialization: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export type TrainerClientLink = {
  id: string
  trainer_id: string
  client_id: string
  status: 'active' | 'inactive'
  goals: string | null
  started_at: string
  created_at: string
}

export type WorkoutPlan = {
  id: string
  trainer_id: string
  client_id: string
  title: string
  description: string | null
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export type PlanDay = {
  id: string
  plan_id: string
  title: string
  day_order: number
  notes: string | null
  created_at: string
}

export type PlanExercise = {
  id: string
  plan_day_id: string
  name: string
  target_sets: number
  target_reps: number
  target_weight: number
  rest_seconds: number
  notes: string | null
  exercise_order: number
  created_at: string
}

export type WorkoutSession = {
  id: string
  plan_day_id: string | null
  client_id: string
  trainer_id: string
  title: string
  scheduled_date: string
  completed_at: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed'
  feeling: number | null
  notes: string | null
  created_at: string
}

export type SessionLog = {
  id: string
  session_id: string
  exercise_name: string
  set_number: number
  reps: number | null
  weight: number | null
  completed: boolean
  created_at: string
}

export type Measurement = {
  id: string
  client_id: string
  body_weight: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  left_arm: number | null
  right_arm: number | null
  left_thigh: number | null
  right_thigh: number | null
  left_calf: number | null
  right_calf: number | null
  notes: string | null
  logged_at: string
  created_at: string
}

export type ProgressPhoto = {
  id: string
  client_id: string
  photo_url: string
  caption: string | null
  photo_type: 'front' | 'side' | 'back' | 'other'
  taken_at: string
  created_at: string
}

export type Achievement = {
  id: string
  client_id: string
  type: string
  title: string
  description: string | null
  earned_at: string
}

export type ActivityEvent = {
  id: string
  client_id: string
  trainer_id: string | null
  event_type: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

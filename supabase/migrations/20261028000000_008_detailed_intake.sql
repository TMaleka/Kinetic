/*
# Detailed client intake

Structured onboarding answers (goal-specific targets, deadline, motivation,
baseline, health and logistics) are stored in client_goals.details as JSON.
*/
ALTER TABLE public.client_goals ADD COLUMN IF NOT EXISTS details jsonb;
ALTER TABLE public.client_goals ADD COLUMN IF NOT EXISTS target_date date;

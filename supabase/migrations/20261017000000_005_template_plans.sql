/*
# Allow unassigned (template) workout plans

PlanBuilder's "Save as template (assign later)" inserts workout_plans with
client_id = NULL, which the original NOT NULL constraint rejected, so
templates were never saved and could not be assigned to clients later.
*/
ALTER TABLE public.workout_plans ALTER COLUMN client_id DROP NOT NULL;

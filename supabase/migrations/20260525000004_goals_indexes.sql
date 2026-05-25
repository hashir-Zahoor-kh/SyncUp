-- Phase 5B: Goal board — performance indexes
CREATE INDEX IF NOT EXISTS goals_week_start_idx ON public.goals(week_start);
CREATE INDEX IF NOT EXISTS goals_completed_at_idx ON public.goals(completed_at) WHERE completed_at IS NOT NULL;

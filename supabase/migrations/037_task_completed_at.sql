-- Add completed_at timestamp to track exactly when a task was completed
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill: for existing completed tasks, use updated_at as best approximation
UPDATE tasks SET completed_at = updated_at WHERE status = 'completed' AND completed_at IS NULL;

-- Index for efficient monthly performance queries
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks (completed_at) WHERE completed_at IS NOT NULL;

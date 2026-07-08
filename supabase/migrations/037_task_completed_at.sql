-- Add completed_at timestamp to track exactly when a task was completed
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill: for existing completed tasks, use updated_at as best approximation
UPDATE tasks SET completed_at = updated_at WHERE status = 'completed' AND completed_at IS NULL;

-- Index for efficient monthly performance queries
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks (completed_at) WHERE completed_at IS NOT NULL;

-- Add camelCase columns that the app code uses (the DB was created with snake_case
-- but all app API routes use camelCase column names)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "assignedTo" text[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "projectId" uuid;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "deadline" date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "createdAt" timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "createdById" text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "parentTaskId" uuid;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "clientId" uuid;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "actualHours" numeric;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category text;

-- Sync existing data
UPDATE tasks SET
  "assignedTo" = CASE WHEN assignee_id IS NOT NULL THEN ARRAY[assignee_id] ELSE '{}'::text[] END,
  "projectId" = project_id,
  "deadline" = due_date,
  "createdAt" = created_at,
  "updatedAt" = updated_at,
  "parentTaskId" = parent_task_id;

-- Trigger to keep both column sets in sync
CREATE OR REPLACE FUNCTION sync_task_columns() RETURNS TRIGGER AS $$
BEGIN
  -- camelCase -> snake_case
  IF NEW."assignedTo" IS DISTINCT FROM OLD."assignedTo" THEN
    NEW.assignee_id := CASE WHEN array_length(NEW."assignedTo", 1) > 0 THEN NEW."assignedTo"[1] ELSE NULL END;
  END IF;
  IF NEW."projectId" IS DISTINCT FROM OLD."projectId" THEN
    NEW.project_id := NEW."projectId";
  END IF;
  IF NEW."deadline" IS DISTINCT FROM OLD."deadline" THEN
    NEW.due_date := NEW."deadline";
  END IF;
  IF NEW."parentTaskId" IS DISTINCT FROM OLD."parentTaskId" THEN
    NEW.parent_task_id := NEW."parentTaskId";
  END IF;
  IF NEW."actualHours" IS DISTINCT FROM OLD."actualHours" THEN
    NEW.actual_hours := NEW."actualHours";
  END IF;
  -- snake_case -> camelCase
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    NEW."assignedTo" := CASE WHEN NEW.assignee_id IS NOT NULL THEN ARRAY[NEW.assignee_id] ELSE '{}'::text[] END;
  END IF;
  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    NEW."projectId" := NEW.project_id;
  END IF;
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    NEW."deadline" := NEW.due_date;
  END IF;
  IF NEW.parent_task_id IS DISTINCT FROM OLD.parent_task_id THEN
    NEW."parentTaskId" := NEW.parent_task_id;
  END IF;
  IF NEW.actual_hours IS DISTINCT FROM OLD.actual_hours THEN
    NEW."actualHours" := NEW.actual_hours;
  END IF;
  NEW."createdAt" := NEW.created_at;
  NEW."updatedAt" := NEW.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_task_columns ON tasks;
CREATE TRIGGER trg_sync_task_columns
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_columns();

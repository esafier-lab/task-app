-- Migration 8: Add reminder_sent column for task reminders

-- due_date already exists in your tasks table — do NOT add it again
-- We only add the new column below:

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;

-- Optional: add index to speed up reminder queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
ON tasks (due_date);

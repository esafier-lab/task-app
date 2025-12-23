-- Migration 9: Add priority column for task priority levels
-- Priority levels: 1 = low, 2 = medium, 3 = high

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 2;

-- Add index to speed up priority-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_priority
ON tasks (priority);

-- Add constraint to ensure priority is between 1 and 3
ALTER TABLE tasks
ADD CONSTRAINT check_priority_range CHECK (priority >= 1 AND priority <= 3);


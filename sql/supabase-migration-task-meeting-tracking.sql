-- Migration: Add meeting tracking to tasks
-- This allows tracking which tasks came from which meeting

-- Add meetingId column to tasks table (optional, since tasks can be created manually)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS "meetingId" UUID REFERENCES meetings(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_meeting_id ON tasks("meetingId");

-- Update existing tasks that were created from approved suggestions
-- This links tasks back to their source meeting via the ai_suggestions table
UPDATE tasks
SET "meetingId" = (
  SELECT ai_suggestions."meetingId"
  FROM ai_suggestions
  WHERE ai_suggestions.status = 'approved'
  AND ai_suggestions."suggestedTask" = tasks.title
  LIMIT 1
)
WHERE "meetingId" IS NULL
AND EXISTS (
  SELECT 1
  FROM ai_suggestions
  WHERE ai_suggestions.status = 'approved'
  AND ai_suggestions."suggestedTask" = tasks.title
);


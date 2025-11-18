-- Migration: Add suggestedDescription column to ai_suggestions table
-- This column stores the AI-generated intelligent description for task suggestions

-- Add the column (nullable, as existing records won't have it)
ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS "suggestedDescription" TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN ai_suggestions."suggestedDescription" IS 'AI-generated intelligent description (2-4 sentences) that explains WHAT needs to be done, WHY it is important, and HOW to approach it. This is different from originalText and provides contextually relevant details.';


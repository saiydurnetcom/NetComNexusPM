-- Update meetings table to make projectId optional
-- Run this SQL in your Supabase SQL Editor

-- First, drop the NOT NULL constraint on projectId
ALTER TABLE meetings 
  ALTER COLUMN "projectId" DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- (The existing constraint should already allow NULL, but we'll ensure it)
ALTER TABLE meetings 
  DROP CONSTRAINT IF EXISTS meetings_projectId_fkey;

ALTER TABLE meetings 
  ADD CONSTRAINT meetings_projectId_fkey 
  FOREIGN KEY ("projectId") 
  REFERENCES projects(id) 
  ON DELETE CASCADE;


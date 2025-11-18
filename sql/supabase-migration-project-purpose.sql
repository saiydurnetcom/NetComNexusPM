-- Add purpose and resources fields to projects table
-- Run this SQL in your Supabase SQL Editor

-- Add purpose column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Add resources column (JSONB for flexibility - can store array of resource objects)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN projects.purpose IS 'The purpose or goal of the project';
COMMENT ON COLUMN projects.resources IS 'Project resources stored as JSON array, e.g., [{"name": "Resource Name", "type": "person|equipment|budget", "description": "..."}]';


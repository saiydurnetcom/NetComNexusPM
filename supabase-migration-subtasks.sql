-- Migration: Sub-tasks
-- Run this SQL in your Supabase SQL Editor to enable sub-tasks

-- Add parentTaskId column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS "parentTaskId" UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks("parentTaskId");

-- Prevent a task from being its own parent
ALTER TABLE tasks
ADD CONSTRAINT no_self_parent CHECK ("parentTaskId" IS NULL OR "parentTaskId" != id);

-- Note: RLS policies on tasks table already cover sub-tasks since they're just tasks with a parentTaskId


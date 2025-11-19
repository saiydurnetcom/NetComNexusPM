-- Migration: Add 'in_progress' status to project_milestones
-- Run this SQL in your Supabase SQL Editor

-- Drop the existing check constraint
ALTER TABLE project_milestones DROP CONSTRAINT IF EXISTS project_milestones_status_check;

-- Add new check constraint with 'in_progress' status
ALTER TABLE project_milestones 
  ADD CONSTRAINT project_milestones_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue'));


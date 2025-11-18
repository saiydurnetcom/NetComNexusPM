-- Migration: Project Milestones
-- Run this SQL in your Supabase SQL Editor to enable milestone tracking

CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  "targetDate" TIMESTAMPTZ NOT NULL,
  "completedDate" TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  "createdBy" UUID NOT NULL REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones("projectId");
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_target_date ON project_milestones("targetDate");

-- Enable Row Level Security (RLS)
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view project milestones" ON project_milestones;
DROP POLICY IF EXISTS "Users can create project milestones" ON project_milestones;
DROP POLICY IF EXISTS "Users can update project milestones" ON project_milestones;
DROP POLICY IF EXISTS "Users can delete project milestones" ON project_milestones;

-- Simplified to avoid infinite recursion
CREATE POLICY "Users can view project milestones"
  ON project_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones."projectId"
      AND p."createdBy" = auth.uid()
    )
    OR "createdBy" = auth.uid()
  );

CREATE POLICY "Users can create project milestones"
  ON project_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones."projectId"
      AND p."createdBy" = auth.uid()
    )
    AND "createdBy" = auth.uid()
  );

CREATE POLICY "Users can update project milestones"
  ON project_milestones FOR UPDATE
  USING (
    "createdBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones."projectId"
      AND p."createdBy" = auth.uid()
    )
  );

CREATE POLICY "Users can delete project milestones"
  ON project_milestones FOR DELETE
  USING (
    "createdBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones."projectId"
      AND p."createdBy" = auth.uid()
    )
  );

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_project_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS update_project_milestones_updated_at ON project_milestones;

CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_project_milestones_updated_at();


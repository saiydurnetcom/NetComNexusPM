-- Migration: Project Reports Table
-- Run this SQL in your Supabase SQL Editor to store AI-generated project reports

-- Project Reports table
CREATE TABLE IF NOT EXISTS project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "reportType" TEXT NOT NULL DEFAULT 'cxo' CHECK ("reportType" IN ('cxo', 'summary', 'detailed')),
  "generatedBy" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_reports_project_id ON project_reports("projectId");
CREATE INDEX IF NOT EXISTS idx_project_reports_generated_by ON project_reports("generatedBy");
CREATE INDEX IF NOT EXISTS idx_project_reports_created_at ON project_reports("createdAt" DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE project_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view reports for projects they have access to
CREATE POLICY "Users can view reports for their projects"
  ON project_reports FOR SELECT
  USING (
    -- Project creator
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_reports."projectId" 
      AND projects."createdBy" = auth.uid()
    )
    OR
    -- User assigned to tasks in the project
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks."projectId" = project_reports."projectId" 
      AND tasks."assignedTo" = auth.uid()
    )
    OR
    -- Admin or manager
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
    )
  );

-- Users can create reports for projects they have access to
CREATE POLICY "Users can create reports for their projects"
  ON project_reports FOR INSERT
  WITH CHECK (
    (
      -- Project creator
      EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_reports."projectId" 
        AND projects."createdBy" = auth.uid()
      )
      OR
      -- User assigned to tasks in the project
      EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks."projectId" = project_reports."projectId" 
        AND tasks."assignedTo" = auth.uid()
      )
      OR
      -- Admin or manager
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
      )
    )
    AND "generatedBy" = auth.uid()  -- This ensures the report is created by the user
  );

-- Users can update their own reports
CREATE POLICY "Users can update their own reports"
  ON project_reports FOR UPDATE
  USING ("generatedBy" = auth.uid())
  WITH CHECK ("generatedBy" = auth.uid());

-- Users can delete their own reports
CREATE POLICY "Users can delete their own reports"
  ON project_reports FOR DELETE
  USING ("generatedBy" = auth.uid());


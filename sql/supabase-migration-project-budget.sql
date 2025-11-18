-- Migration: Project Budget Tracking
-- Run this SQL in your Supabase SQL Editor to enable budget tracking

-- Add budget columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS "budgetAmount" DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS "budgetCurrency" TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS "actualSpent" DECIMAL(12, 2) DEFAULT 0;

-- Project Budget Items table (for detailed budget breakdown)
CREATE TABLE IF NOT EXISTS project_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  "budgetedAmount" DECIMAL(12, 2) NOT NULL,
  "actualAmount" DECIMAL(12, 2) DEFAULT 0,
  "currency" TEXT DEFAULT 'USD',
  "createdBy" UUID NOT NULL REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_budget_items_project ON project_budget_items("projectId");

-- Enable Row Level Security (RLS)
ALTER TABLE project_budget_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view project budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Users can create project budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Users can update project budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Users can delete project budget items" ON project_budget_items;

-- Simplified to avoid infinite recursion
CREATE POLICY "Users can view project budget items"
  ON project_budget_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_budget_items."projectId"
      AND p."createdBy" = auth.uid()
    )
    OR "createdBy" = auth.uid()
  );

CREATE POLICY "Users can create project budget items"
  ON project_budget_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_budget_items."projectId"
      AND p."createdBy" = auth.uid()
    )
    AND "createdBy" = auth.uid()
  );

CREATE POLICY "Users can update project budget items"
  ON project_budget_items FOR UPDATE
  USING (
    "createdBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_budget_items."projectId"
      AND p."createdBy" = auth.uid()
    )
  );

CREATE POLICY "Users can delete project budget items"
  ON project_budget_items FOR DELETE
  USING (
    "createdBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_budget_items."projectId"
      AND p."createdBy" = auth.uid()
    )
  );

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_project_budget_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS update_project_budget_items_updated_at ON project_budget_items;

CREATE TRIGGER update_project_budget_items_updated_at
  BEFORE UPDATE ON project_budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_project_budget_items_updated_at();


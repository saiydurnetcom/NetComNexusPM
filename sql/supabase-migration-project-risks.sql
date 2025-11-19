-- Migration: Project Risks & Mitigation
-- Run this SQL in your Supabase SQL Editor to enable risk tracking

-- Project Risks table
CREATE TABLE IF NOT EXISTS project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "riskCategory" TEXT NOT NULL CHECK ("riskCategory" IN (
    'technical', 
    'schedule', 
    'budget', 
    'resource', 
    'scope', 
    'quality', 
    'external', 
    'other'
  )),
  "probability" TEXT NOT NULL CHECK ("probability" IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  "impact" TEXT NOT NULL CHECK ("impact" IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  "riskScore" INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN "probability" = 'low' AND "impact" = 'low' THEN 1
      WHEN "probability" = 'low' AND "impact" = 'medium' THEN 2
      WHEN "probability" = 'low' AND "impact" = 'high' THEN 3
      WHEN "probability" = 'low' AND "impact" = 'critical' THEN 4
      WHEN "probability" = 'medium' AND "impact" = 'low' THEN 2
      WHEN "probability" = 'medium' AND "impact" = 'medium' THEN 4
      WHEN "probability" = 'medium' AND "impact" = 'high' THEN 6
      WHEN "probability" = 'medium' AND "impact" = 'critical' THEN 8
      WHEN "probability" = 'high' AND "impact" = 'low' THEN 3
      WHEN "probability" = 'high' AND "impact" = 'medium' THEN 6
      WHEN "probability" = 'high' AND "impact" = 'high' THEN 9
      WHEN "probability" = 'high' AND "impact" = 'critical' THEN 12
      WHEN "probability" = 'critical' AND "impact" = 'low' THEN 4
      WHEN "probability" = 'critical' AND "impact" = 'medium' THEN 8
      WHEN "probability" = 'critical' AND "impact" = 'high' THEN 12
      WHEN "probability" = 'critical' AND "impact" = 'critical' THEN 16
      ELSE 0
    END
  ) STORED,
  status TEXT NOT NULL CHECK (status IN ('identified', 'monitoring', 'mitigated', 'closed')) DEFAULT 'identified',
  "mitigationStrategy" TEXT,
  "mitigationOwner" UUID REFERENCES auth.users(id),
  "targetMitigationDate" TIMESTAMPTZ,
  "actualMitigationDate" TIMESTAMPTZ,
  "createdBy" UUID NOT NULL REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_risks_project ON project_risks("projectId");
CREATE INDEX IF NOT EXISTS idx_project_risks_status ON project_risks(status);
CREATE INDEX IF NOT EXISTS idx_project_risks_risk_score ON project_risks("riskScore" DESC);
CREATE INDEX IF NOT EXISTS idx_project_risks_category ON project_risks("riskCategory");

-- Enable Row Level Security (RLS)
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view project risks" ON project_risks;
DROP POLICY IF EXISTS "Users can create project risks" ON project_risks;
DROP POLICY IF EXISTS "Users can update project risks" ON project_risks;
DROP POLICY IF EXISTS "Users can delete project risks" ON project_risks;

-- Users can view risks for projects they created or are members of
-- Simplified to avoid infinite recursion - check project creator directly
CREATE POLICY "Users can view project risks"
  ON project_risks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_risks."projectId"
      AND p."createdBy" = auth.uid()
    )
    OR "createdBy" = auth.uid()
  );

-- Users can create risks for projects they created
CREATE POLICY "Users can create project risks"
  ON project_risks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_risks."projectId"
      AND p."createdBy" = auth.uid()
    )
    AND "createdBy" = auth.uid()
  );

-- Users can update risks they created or for projects they created
CREATE POLICY "Users can update project risks"
  ON project_risks FOR UPDATE
  USING (
    "createdBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_risks."projectId"
      AND p."createdBy" = auth.uid()
    )
  );

-- Users can delete risks they created or for projects they created
CREATE POLICY "Users can delete project risks"
  ON project_risks FOR DELETE
  USING (
    "createdBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_risks."projectId"
      AND p."createdBy" = auth.uid()
    )
  );

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_project_risks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS update_project_risks_updated_at ON project_risks;

CREATE TRIGGER update_project_risks_updated_at
  BEFORE UPDATE ON project_risks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_risks_updated_at();


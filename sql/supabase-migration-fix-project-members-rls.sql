-- Fix infinite recursion in project_members RLS policies
-- Run this SQL in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Project owners can update members" ON project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON project_members;

-- Project Members: Users can view members if they are the member themselves or if they created the project
-- Removed recursive check to prevent infinite recursion
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (
    "userId" = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members."projectId"
      AND projects."createdBy" = auth.uid()
    )
  );

-- Project Members: Only project owners and admins can add members
CREATE POLICY "Project owners can add members" ON project_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members."projectId"
      AND projects."createdBy" = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Project Members: Only project owners and admins can update members
CREATE POLICY "Project owners can update members" ON project_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members."projectId"
      AND projects."createdBy" = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Project Members: Only project owners and admins can delete members
CREATE POLICY "Project owners can delete members" ON project_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members."projectId"
      AND projects."createdBy" = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );


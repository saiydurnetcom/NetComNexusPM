-- Update RLS policies for meetings to allow meetings without projects
-- Run this SQL in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view meetings in their projects" ON meetings;
DROP POLICY IF EXISTS "Users can create meetings in their projects" ON meetings;
DROP POLICY IF EXISTS "Users can update meetings in their projects" ON meetings;
DROP POLICY IF EXISTS "Users can delete meetings in their projects" ON meetings;

-- Create updated policies that allow meetings without projects
CREATE POLICY "Users can view their own meetings" ON meetings
  FOR SELECT USING (
    meetings."createdBy" = auth.uid() OR
    (
      meetings."projectId" IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = meetings."projectId" 
        AND projects."createdBy" = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create their own meetings" ON meetings
  FOR INSERT WITH CHECK (
    auth.uid() = meetings."createdBy" AND
    (
      meetings."projectId" IS NULL OR
      EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = meetings."projectId" 
        AND projects."createdBy" = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own meetings" ON meetings
  FOR UPDATE USING (
    meetings."createdBy" = auth.uid() OR
    (
      meetings."projectId" IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = meetings."projectId" 
        AND projects."createdBy" = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own meetings" ON meetings
  FOR DELETE USING (
    meetings."createdBy" = auth.uid() OR
    (
      meetings."projectId" IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = meetings."projectId" 
        AND projects."createdBy" = auth.uid()
      )
    )
  );


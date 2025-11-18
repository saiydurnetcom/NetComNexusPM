-- Fix RLS policies for ai_suggestions to handle meetings without projects
-- The current policy requires a project, but meetings can be created without projects

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view suggestions for their meetings" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can create suggestions for their meetings" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can update suggestions for their meetings" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can delete suggestions for their meetings" ON ai_suggestions;

-- New policy: Users can view suggestions for meetings they created
-- OR for meetings in projects they created
CREATE POLICY "Users can view suggestions for their meetings" ON ai_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = ai_suggestions."meetingId" 
      AND (
        meetings."createdBy" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects 
          WHERE projects.id = meetings."projectId" 
          AND projects."createdBy" = auth.uid()
        )
      )
    )
  );

-- New policy: Users can create suggestions for meetings they created
-- OR for meetings in projects they created
CREATE POLICY "Users can create suggestions for their meetings" ON ai_suggestions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = ai_suggestions."meetingId" 
      AND (
        meetings."createdBy" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects 
          WHERE projects.id = meetings."projectId" 
          AND projects."createdBy" = auth.uid()
        )
      )
    )
  );

-- New policy: Users can update suggestions for meetings they created
-- OR for meetings in projects they created
CREATE POLICY "Users can update suggestions for their meetings" ON ai_suggestions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = ai_suggestions."meetingId" 
      AND (
        meetings."createdBy" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects 
          WHERE projects.id = meetings."projectId" 
          AND projects."createdBy" = auth.uid()
        )
      )
    )
  );

-- New policy: Users can delete suggestions for meetings they created
-- OR for meetings in projects they created
CREATE POLICY "Users can delete suggestions for their meetings" ON ai_suggestions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = ai_suggestions."meetingId" 
      AND (
        meetings."createdBy" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects 
          WHERE projects.id = meetings."projectId" 
          AND projects."createdBy" = auth.uid()
        )
      )
    )
  );


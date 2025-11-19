-- Migration: Add Reviewer and Attachments to Tasks
-- Run this migration after the base migration

-- ============================================
-- 1. ADD REVIEWER COLUMN TO TASKS
-- ============================================
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS "reviewerId" UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for reviewer lookups
CREATE INDEX IF NOT EXISTS idx_tasks_reviewer ON tasks("reviewerId");

-- ============================================
-- 2. TASK ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL, -- Size in bytes
  "mimeType" TEXT,
  "uploadedBy" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for task attachments
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments("taskId");
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments("uploadedBy");

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on task_attachments
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for tasks they have access to
CREATE POLICY "Users can view task attachments" ON task_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments."taskId"
      AND (
        tasks."assignedTo" = auth.uid()
        OR tasks."createdBy" = auth.uid()
        OR tasks."reviewerId" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = tasks."projectId"
          AND projects."createdBy" = auth.uid()
        )
      )
    )
  );

-- Users can upload attachments to tasks they have access to
CREATE POLICY "Users can upload task attachments" ON task_attachments
  FOR INSERT WITH CHECK (
    "uploadedBy" = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments."taskId"
      AND (
        tasks."assignedTo" = auth.uid()
        OR tasks."createdBy" = auth.uid()
        OR tasks."reviewerId" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = tasks."projectId"
          AND projects."createdBy" = auth.uid()
        )
      )
    )
  );

-- Users can delete their own attachments or attachments on tasks they manage
CREATE POLICY "Users can delete task attachments" ON task_attachments
  FOR DELETE USING (
    "uploadedBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments."taskId"
      AND (
        tasks."createdBy" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = tasks."projectId"
          AND projects."createdBy" = auth.uid()
        )
      )
    )
  );

-- ============================================
-- 4. SUPABASE STORAGE BUCKET FOR ATTACHMENTS
-- ============================================
-- Note: You'll need to create this bucket manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named "task-attachments"
-- 3. Set it to public or configure policies as needed
-- 4. Add storage policies (see below)

-- Storage policies (run these in Supabase SQL Editor after creating the bucket):
/*
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM tasks
    WHERE "assignedTo" = auth.uid()
    OR "createdBy" = auth.uid()
    OR "reviewerId" = auth.uid()
  )
);

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read task attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM tasks
    WHERE "assignedTo" = auth.uid()
    OR "createdBy" = auth.uid()
    OR "reviewerId" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks."projectId"
      AND projects."createdBy" = auth.uid()
    )
  )
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their task attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM tasks
    WHERE "createdBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks."projectId"
      AND projects."createdBy" = auth.uid()
    )
  )
);
*/

-- ============================================
-- NOTES:
-- ============================================
-- 1. After running this migration:
--    - Create the "task-attachments" storage bucket in Supabase Dashboard
--    - Configure storage policies (see above)
--    - Set bucket to public or configure access as needed
--
-- 2. The reviewerId field allows tracking who is reviewing a task
--    when it's in "review" status
--
-- 3. File size limits should be enforced in the application code
--    (recommended: 10MB per file)
--
-- 4. Consider adding file type restrictions in the application
--    for security purposes


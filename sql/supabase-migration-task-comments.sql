-- Migration: Task Comments & Mentions
-- Run this SQL in your Supabase SQL Editor to enable comments on tasks

-- Task Comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  "mentionedUserIds" UUID[] DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments("taskId");
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments("userId");
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON task_comments("createdAt" DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view comments for tasks they have access to
CREATE POLICY "Users can view task comments"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments."taskId"
      AND (
        tasks."assignedTo" = auth.uid()
        OR tasks."createdBy" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = tasks."projectId"
          AND (
            projects."createdBy" = auth.uid()
            OR EXISTS (
              SELECT 1 FROM project_members
              WHERE project_members."projectId" = projects.id
              AND project_members."userId" = auth.uid()
            )
          )
        )
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
      )
    )
  );

-- Users can create comments for tasks they have access to
CREATE POLICY "Users can create task comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    "userId" = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments."taskId"
      AND (
        tasks."assignedTo" = auth.uid()
        OR tasks."createdBy" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = tasks."projectId"
          AND (
            projects."createdBy" = auth.uid()
            OR EXISTS (
              SELECT 1 FROM project_members
              WHERE project_members."projectId" = projects.id
              AND project_members."userId" = auth.uid()
            )
          )
        )
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own task comments"
  ON task_comments FOR UPDATE
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Users can delete their own comments or admins/managers can delete any
CREATE POLICY "Users can delete task comments"
  ON task_comments FOR DELETE
  USING (
    "userId" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_task_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_comment_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comment_updated_at();


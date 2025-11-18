-- Migration: Task Dependencies
-- Run this SQL in your Supabase SQL Editor to enable task dependencies

-- Task Dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  "dependsOnTaskId" UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  "dependencyType" TEXT NOT NULL DEFAULT 'finish_to_start' 
    CHECK ("dependencyType" IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK ("taskId" != "dependsOnTaskId"),
  UNIQUE("taskId", "dependsOnTaskId")
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies("taskId");
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies("dependsOnTaskId");

-- Enable Row Level Security (RLS)
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view dependencies for tasks they have access to
CREATE POLICY "Users can view task dependencies"
  ON task_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies."taskId"
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

-- Users can create dependencies for tasks they can edit
CREATE POLICY "Users can create task dependencies"
  ON task_dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies."taskId"
      AND (
        tasks."assignedTo" = auth.uid()
        OR tasks."createdBy" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = tasks."projectId"
          AND projects."createdBy" = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
      )
    )
  );

-- Users can delete dependencies for tasks they can edit
CREATE POLICY "Users can delete task dependencies"
  ON task_dependencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies."taskId"
      AND (
        tasks."assignedTo" = auth.uid()
        OR tasks."createdBy" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = tasks."projectId"
          AND projects."createdBy" = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
      )
    )
  );

-- Function to check for circular dependencies (prevent infinite loops)
CREATE OR REPLACE FUNCTION check_circular_dependency(
  p_task_id UUID,
  p_depends_on_task_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_visited UUID[] := ARRAY[]::UUID[];
  v_current UUID;
  v_queue UUID[] := ARRAY[p_depends_on_task_id];
BEGIN
  -- If trying to create a dependency where the dependent task already depends on the current task
  IF EXISTS (
    SELECT 1 FROM task_dependencies
    WHERE "taskId" = p_depends_on_task_id
    AND "dependsOnTaskId" = p_task_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- BFS to check for circular dependencies
  WHILE array_length(v_queue, 1) > 0 LOOP
    v_current := v_queue[1];
    v_queue := v_queue[2:array_length(v_queue, 1)];

    -- If we've seen this task before, we have a cycle
    IF v_current = ANY(v_visited) THEN
      RETURN FALSE;
    END IF;

    v_visited := array_append(v_visited, v_current);

    -- Add all tasks that this task depends on to the queue
    SELECT array_agg("dependsOnTaskId") INTO v_queue
    FROM task_dependencies
    WHERE "taskId" = v_current
    AND "dependsOnTaskId" IS NOT NULL;

    IF v_queue IS NULL THEN
      v_queue := ARRAY[]::UUID[];
    END IF;

    -- If we reach the original task, we have a cycle
    IF p_task_id = ANY(v_queue) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent circular dependencies
CREATE OR REPLACE FUNCTION prevent_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_circular_dependency(NEW."taskId", NEW."dependsOnTaskId") THEN
    RAISE EXCEPTION 'Circular dependency detected. Cannot create this dependency.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_circular_dependency_trigger
  BEFORE INSERT ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_dependency();


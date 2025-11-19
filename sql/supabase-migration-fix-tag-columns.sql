-- Fix column names in project_tags and task_tags tables
-- PostgreSQL converts unquoted identifiers to lowercase, so we need to rename them

-- Check if columns exist and rename them if needed
DO $$
BEGIN
  -- Fix project_tags table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_tags' AND column_name = 'projectid'
  ) THEN
    ALTER TABLE project_tags RENAME COLUMN projectid TO "projectId";
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_tags' AND column_name = 'tagid'
  ) THEN
    ALTER TABLE project_tags RENAME COLUMN tagid TO "tagId";
  END IF;
  
  -- Fix task_tags table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_tags' AND column_name = 'taskid'
  ) THEN
    ALTER TABLE task_tags RENAME COLUMN taskid TO "taskId";
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_tags' AND column_name = 'tagid'
  ) THEN
    ALTER TABLE task_tags RENAME COLUMN tagid TO "tagId";
  END IF;
END $$;

-- Recreate indexes with correct column names
DROP INDEX IF EXISTS idx_project_tags_project;
DROP INDEX IF EXISTS idx_project_tags_tag;
DROP INDEX IF EXISTS idx_task_tags_task;
DROP INDEX IF EXISTS idx_task_tags_tag;

CREATE INDEX IF NOT EXISTS idx_project_tags_project ON project_tags("projectId");
CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON project_tags("tagId");
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags("taskId");
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags("tagId");


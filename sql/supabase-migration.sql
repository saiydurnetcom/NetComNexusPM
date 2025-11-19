-- Supabase Database Migration
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ NOT NULL,
  "createdBy" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  "estimatedHours" NUMERIC NOT NULL DEFAULT 0,
  "assignedTo" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdBy" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "dueDate" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "taskId" UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  "startTime" TIMESTAMPTZ NOT NULL,
  "endTime" TIMESTAMPTZ,
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  billable BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT NOT NULL,
  "meetingDate" TIMESTAMPTZ NOT NULL,
  "createdBy" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Suggestions table
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "meetingId" UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  "originalText" TEXT NOT NULL,
  "suggestedTask" TEXT NOT NULL,
  "confidenceScore" NUMERIC NOT NULL CHECK ("confidenceScore" >= 0 AND "confidenceScore" <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  "reviewedBy" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "reviewedAt" TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects("createdBy");
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks("projectId");
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks("assignedTo");
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries("userId");
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries("taskId");
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries("startTime");
CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON meetings("projectId");
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_meeting_id ON ai_suggestions("meetingId");
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(status);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Projects
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = "createdBy");

CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = "createdBy");

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = "createdBy");

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = "createdBy");

-- RLS Policies for Tasks
CREATE POLICY "Users can view their tasks" ON tasks
  FOR SELECT USING (
    tasks."createdBy" = auth.uid() OR
    tasks."assignedTo" = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks."projectId" 
      AND projects."createdBy" = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() = "createdBy" AND
    (
      tasks."projectId" IS NULL OR
      EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = tasks."projectId" 
        AND projects."createdBy" = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their tasks" ON tasks
  FOR UPDATE USING (
    tasks."createdBy" = auth.uid() OR
    tasks."assignedTo" = auth.uid() OR
    (
      tasks."projectId" IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = tasks."projectId" 
        AND projects."createdBy" = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their tasks" ON tasks
  FOR DELETE USING (
    tasks."createdBy" = auth.uid() OR
    (
      tasks."projectId" IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = tasks."projectId" 
        AND projects."createdBy" = auth.uid()
      )
    )
  );

-- RLS Policies for Time Entries
CREATE POLICY "Users can view their own time entries" ON time_entries
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can create their own time entries" ON time_entries
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own time entries" ON time_entries
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own time entries" ON time_entries
  FOR DELETE USING (auth.uid() = "userId");

-- RLS Policies for Meetings
CREATE POLICY "Users can view meetings in their projects" ON meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = meetings."projectId" 
      AND projects."createdBy" = auth.uid()
    )
  );

CREATE POLICY "Users can create meetings in their projects" ON meetings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = meetings."projectId" 
      AND projects."createdBy" = auth.uid()
    )
    AND auth.uid() = "createdBy"
  );

CREATE POLICY "Users can update meetings in their projects" ON meetings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = meetings."projectId" 
      AND projects."createdBy" = auth.uid()
    )
  );

CREATE POLICY "Users can delete meetings in their projects" ON meetings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = meetings."projectId" 
      AND projects."createdBy" = auth.uid()
    )
  );

-- RLS Policies for AI Suggestions
CREATE POLICY "Users can view suggestions for their meetings" ON ai_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      JOIN projects ON projects.id = meetings."projectId"
      WHERE meetings.id = ai_suggestions."meetingId" 
      AND projects."createdBy" = auth.uid()
    )
  );

CREATE POLICY "Users can create suggestions for their meetings" ON ai_suggestions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings 
      JOIN projects ON projects.id = meetings."projectId"
      WHERE meetings.id = ai_suggestions."meetingId" 
      AND projects."createdBy" = auth.uid()
    )
  );

CREATE POLICY "Users can update suggestions for their meetings" ON ai_suggestions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM meetings 
      JOIN projects ON projects.id = meetings."projectId"
      WHERE meetings.id = ai_suggestions."meetingId" 
      AND projects."createdBy" = auth.uid()
    )
  );

CREATE POLICY "Users can delete suggestions for their meetings" ON ai_suggestions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM meetings 
      JOIN projects ON projects.id = meetings."projectId"
      WHERE meetings.id = ai_suggestions."meetingId" 
      AND projects."createdBy" = auth.uid()
    )
  );


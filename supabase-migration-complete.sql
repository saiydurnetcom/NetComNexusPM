-- ============================================
-- COMPLETE SUPABASE MIGRATION SCRIPT
-- ============================================
-- This is a comprehensive migration script that includes all tables,
-- RLS policies, functions, triggers, and indexes in the correct order.
-- Run this SQL in your Supabase SQL Editor.
-- ============================================

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CORE TABLES (No dependencies or minimal dependencies)
-- ============================================

-- Departments table (no dependencies)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  "createdBy" UUID REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (references auth.users, departments added later)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Add department reference to users (departments table exists now)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "departmentId" UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Teams table (references departments and users)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  "departmentId" UUID REFERENCES departments(id) ON DELETE SET NULL,
  "teamLeadId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "createdBy" UUID REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Add team reference to users (teams table exists now)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "teamId" UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  category TEXT,
  description TEXT,
  "createdBy" UUID REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

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
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purpose TEXT,
  resources JSONB DEFAULT '[]'::jsonb,
  "budgetAmount" DECIMAL(12, 2),
  "budgetCurrency" TEXT DEFAULT 'USD',
  "actualSpent" DECIMAL(12, 2) DEFAULT 0
);

-- Meetings table (created before tasks since tasks reference meetings)
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT NOT NULL,
  "meetingDate" TIMESTAMPTZ NOT NULL,
  "createdBy" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table (references projects, users, and meetings)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'blocked', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  "estimatedHours" NUMERIC NOT NULL DEFAULT 0,
  "assignedTo" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdBy" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "dueDate" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "parentTaskId" UUID REFERENCES tasks(id) ON DELETE CASCADE,
  "reviewerId" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "meetingId" UUID REFERENCES meetings(id) ON DELETE SET NULL
);

-- Add constraint to prevent self-parent
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS no_self_parent;
ALTER TABLE tasks
ADD CONSTRAINT no_self_parent CHECK ("parentTaskId" IS NULL OR "parentTaskId" != id);

-- ============================================
-- 3. PROJECT-RELATED TABLES
-- ============================================

-- Project Members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')),
  "addedBy" UUID REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("projectId", "userId")
);

-- Project Tags junction table
CREATE TABLE IF NOT EXISTS project_tags (
  "projectId" UUID REFERENCES projects(id) ON DELETE CASCADE,
  "tagId" UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY ("projectId", "tagId"),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Project Risks table
CREATE TABLE IF NOT EXISTS project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "riskCategory" TEXT NOT NULL CHECK ("riskCategory" IN (
    'technical', 'schedule', 'budget', 'resource', 'scope', 'quality', 'external', 'other'
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

-- Project Budget Items table
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

-- Project Milestones table
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  "targetDate" TIMESTAMPTZ NOT NULL,
  "completedDate" TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  "createdBy" UUID NOT NULL REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Project Reports table
CREATE TABLE IF NOT EXISTS project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "reportType" TEXT NOT NULL DEFAULT 'cxo' CHECK ("reportType" IN ('cxo', 'summary', 'detailed')),
  "generatedBy" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. MEETING-RELATED TABLES
-- ============================================
-- Note: Meetings table is created above with projects

-- AI Suggestions table
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "meetingId" UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  "originalText" TEXT NOT NULL,
  "suggestedTask" TEXT NOT NULL,
  "suggestedDescription" TEXT,
  "confidenceScore" NUMERIC NOT NULL CHECK ("confidenceScore" >= 0 AND "confidenceScore" <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  "reviewedBy" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "reviewedAt" TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. TASK-RELATED TABLES
-- ============================================

-- Task Tags junction table
CREATE TABLE IF NOT EXISTS task_tags (
  "taskId" UUID REFERENCES tasks(id) ON DELETE CASCADE,
  "tagId" UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY ("taskId", "tagId"),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

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

-- Task Attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT,
  "uploadedBy" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time Entries table
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

-- ============================================
-- 6. USER-RELATED TABLES
-- ============================================

-- User Notification Preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  "emailNotifications" BOOLEAN DEFAULT true,
  "taskAssignments" BOOLEAN DEFAULT true,
  "projectUpdates" BOOLEAN DEFAULT true,
  "meetingReminders" BOOLEAN DEFAULT true,
  "pushNotifications" BOOLEAN DEFAULT false,
  "pushSubscription" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- User Weekly Hours table
CREATE TABLE IF NOT EXISTS user_weekly_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "weekStartDate" DATE NOT NULL,
  "availableHours" NUMERIC DEFAULT 40,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "weekStartDate")
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'task_assigned', 'task_due', 'task_overdue', 'comment', 'mention', 
    'milestone', 'dependency_blocked', 'task_status_changed', 'project_updated'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  "relatedTaskId" UUID REFERENCES tasks(id) ON DELETE CASCADE,
  "relatedProjectId" UUID REFERENCES projects(id) ON DELETE CASCADE,
  "relatedCommentId" UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. SETTINGS AND OTHER TABLES
-- ============================================

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  "aiApiKey" TEXT,
  "aiApiUrl" TEXT,
  "aiModel" TEXT DEFAULT 'deepseek-reasoner',
  "supabaseUrl" TEXT,
  "supabaseAnonKey" TEXT,
  "updatedBy" UUID REFERENCES auth.users(id),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Allowed Domains table
CREATE TABLE IF NOT EXISTS allowed_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN DEFAULT true,
  "autoAssignTeamId" UUID REFERENCES teams(id) ON DELETE SET NULL,
  "autoAssignDepartmentId" UUID REFERENCES departments(id) ON DELETE SET NULL,
  "createdBy" UUID REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Task Visibility table
CREATE TABLE IF NOT EXISTS task_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  "visibilityType" TEXT NOT NULL CHECK ("visibilityType" IN ('members', 'team_managers', 'upline_managers', 'all')),
  "teamId" UUID REFERENCES teams(id) ON DELETE CASCADE,
  "departmentId" UUID REFERENCES departments(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("taskId", "visibilityType", "teamId", "departmentId")
);

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects("createdBy");

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks("projectId");
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks("assignedTo");
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks("parentTaskId");
CREATE INDEX IF NOT EXISTS idx_tasks_reviewer ON tasks("reviewerId");
CREATE INDEX IF NOT EXISTS idx_tasks_meeting_id ON tasks("meetingId");

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries("userId");
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries("taskId");
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries("startTime");

-- Meetings indexes
CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON meetings("projectId");

-- AI Suggestions indexes
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_meeting_id ON ai_suggestions("meetingId");
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(status);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_team ON users("teamId");
CREATE INDEX IF NOT EXISTS idx_users_department ON users("departmentId");
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams("departmentId");

-- Project Members indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members("projectId");
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members("userId");

-- Project Tags indexes
CREATE INDEX IF NOT EXISTS idx_project_tags_project ON project_tags("projectId");
CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON project_tags("tagId");

-- Task Tags indexes
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags("taskId");
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags("tagId");

-- Task Dependencies indexes
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies("taskId");
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies("dependsOnTaskId");

-- Task Comments indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments("taskId");
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments("userId");
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON task_comments("createdAt" DESC);

-- Task Attachments indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments("taskId");
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments("uploadedBy");

-- Project Risks indexes
CREATE INDEX IF NOT EXISTS idx_project_risks_project ON project_risks("projectId");
CREATE INDEX IF NOT EXISTS idx_project_risks_status ON project_risks(status);
CREATE INDEX IF NOT EXISTS idx_project_risks_risk_score ON project_risks("riskScore" DESC);
CREATE INDEX IF NOT EXISTS idx_project_risks_category ON project_risks("riskCategory");

-- Project Budget Items indexes
CREATE INDEX IF NOT EXISTS idx_project_budget_items_project ON project_budget_items("projectId");

-- Project Milestones indexes
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones("projectId");
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_target_date ON project_milestones("targetDate");

-- Project Reports indexes
CREATE INDEX IF NOT EXISTS idx_project_reports_project_id ON project_reports("projectId");
CREATE INDEX IF NOT EXISTS idx_project_reports_generated_by ON project_reports("generatedBy");
CREATE INDEX IF NOT EXISTS idx_project_reports_created_at ON project_reports("createdAt" DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications("userId", read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- User Notification Preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user ON user_notification_preferences("userId");

-- User Weekly Hours indexes
CREATE INDEX IF NOT EXISTS idx_user_weekly_hours_user ON user_weekly_hours("userId");
CREATE INDEX IF NOT EXISTS idx_user_weekly_hours_week ON user_weekly_hours("weekStartDate");

-- Task Visibility indexes
CREATE INDEX IF NOT EXISTS idx_task_visibility_task ON task_visibility("taskId");

-- Allowed Domains indexes
CREATE INDEX IF NOT EXISTS idx_allowed_domains_domain ON allowed_domains(domain);

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

-- ============================================
-- 9. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weekly_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_visibility ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. FUNCTIONS
-- ============================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync user from auth.users
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Try lowercase first (PostgreSQL lowercases unquoted identifiers)
  BEGIN
    INSERT INTO users (id, email, firstname, lastname, role, isactive, createdat, updatedat)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
      COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
      COALESCE((NEW.raw_user_meta_data->>'role')::text, 'member'),
      true,
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      firstname = COALESCE(EXCLUDED.firstname, users.firstname),
      lastname = COALESCE(EXCLUDED.lastname, users.lastname),
      role = COALESCE(EXCLUDED.role, users.role),
      updatedat = NOW();
    RETURN NEW;
  EXCEPTION
    WHEN undefined_column THEN
      -- If lowercase columns don't exist, try camelCase (quoted identifiers)
      BEGIN
        INSERT INTO users (id, email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
          COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
          COALESCE((NEW.raw_user_meta_data->>'role')::text, 'member'),
          true,
          NEW.created_at,
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET
          email = EXCLUDED.email,
          "firstName" = COALESCE(EXCLUDED."firstName", users."firstName"),
          "lastName" = COALESCE(EXCLUDED."lastName", users."lastName"),
          role = COALESCE(EXCLUDED.role, users.role),
          "updatedAt" = NOW();
        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Failed to sync user to users table: %', SQLERRM;
          RETURN NEW;
      END;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync all users from auth.users
CREATE OR REPLACE FUNCTION sync_users_from_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    INSERT INTO users (id, email, firstname, lastname, role, isactive, createdat, updatedat)
    SELECT 
      id,
      email,
      COALESCE(raw_user_meta_data->>'firstName', split_part(email, '@', 1)),
      COALESCE(raw_user_meta_data->>'lastName', ''),
      COALESCE((raw_user_meta_data->>'role')::text, 'member')::text,
      true,
      created_at,
      NOW()
    FROM auth.users
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      firstname = COALESCE(EXCLUDED.firstname, users.firstname),
      lastname = COALESCE(EXCLUDED.lastname, users.lastname),
      role = COALESCE(EXCLUDED.role, users.role),
      updatedat = NOW();
  EXCEPTION
    WHEN undefined_column THEN
      INSERT INTO users (id, email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
      SELECT 
        id,
        email,
        COALESCE(raw_user_meta_data->>'firstName', split_part(email, '@', 1)),
        COALESCE(raw_user_meta_data->>'lastName', ''),
        COALESCE((raw_user_meta_data->>'role')::text, 'member')::text,
        true,
        created_at,
        NOW()
      FROM auth.users
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        "firstName" = COALESCE(EXCLUDED."firstName", users."firstName"),
        "lastName" = COALESCE(EXCLUDED."lastName", users."lastName"),
        role = COALESCE(EXCLUDED.role, users.role),
        "updatedAt" = NOW();
  END;
END;
$$;

-- Function to get current user role (avoids circular dependency)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT raw_user_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE id = auth.uid();
  
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM users
    WHERE id = auth.uid();
  END IF;
  
  RETURN COALESCE(user_role, 'member');
END;
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN get_current_user_role() = 'admin';
END;
$$;

-- Function to check for circular dependencies in task dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency(
  p_task_id UUID,
  p_depends_on_task_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_visited UUID[] := ARRAY[]::UUID[];
  v_current UUID;
  v_queue UUID[] := ARRAY[p_depends_on_task_id];
BEGIN
  IF EXISTS (
    SELECT 1 FROM task_dependencies
    WHERE "taskId" = p_depends_on_task_id
    AND "dependsOnTaskId" = p_task_id
  ) THEN
    RETURN FALSE;
  END IF;

  WHILE array_length(v_queue, 1) > 0 LOOP
    v_current := v_queue[1];
    v_queue := v_queue[2:array_length(v_queue, 1)];

    IF v_current = ANY(v_visited) THEN
      RETURN FALSE;
    END IF;

    v_visited := array_append(v_visited, v_current);

    SELECT array_agg("dependsOnTaskId") INTO v_queue
    FROM task_dependencies
    WHERE "taskId" = v_current
    AND "dependsOnTaskId" IS NOT NULL;

    IF v_queue IS NULL THEN
      v_queue := ARRAY[]::UUID[];
    END IF;

    IF p_task_id = ANY(v_queue) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent circular dependencies
CREATE OR REPLACE FUNCTION prevent_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_circular_dependency(NEW."taskId", NEW."dependsOnTaskId") THEN
    RAISE EXCEPTION 'Circular dependency detected. Cannot create this dependency.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update task comment updatedAt
CREATE OR REPLACE FUNCTION update_task_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update notification preferences updatedAt
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update project risks updatedAt
CREATE OR REPLACE FUNCTION update_project_risks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update project budget items updatedAt
CREATE OR REPLACE FUNCTION update_project_budget_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update project milestones updatedAt
CREATE OR REPLACE FUNCTION update_project_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true, "readAt" = NOW()
  WHERE id = p_notification_id
  AND "userId" = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true, "readAt" = NOW()
  WHERE "userId" = auth.uid()
  AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION sync_user_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_from_auth() TO service_role;
GRANT EXECUTE ON FUNCTION sync_users_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;

-- ============================================
-- 11. TRIGGERS
-- ============================================

-- Trigger to sync new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_from_auth();

-- Triggers for updatedAt
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_allowed_domains_updated_at ON allowed_domains;
CREATE TRIGGER update_allowed_domains_updated_at BEFORE UPDATE ON allowed_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_comment_updated_at ON task_comments;
CREATE TRIGGER update_task_comment_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comment_updated_at();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

DROP TRIGGER IF EXISTS update_project_risks_updated_at ON project_risks;
CREATE TRIGGER update_project_risks_updated_at
  BEFORE UPDATE ON project_risks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_risks_updated_at();

DROP TRIGGER IF EXISTS update_project_budget_items_updated_at ON project_budget_items;
CREATE TRIGGER update_project_budget_items_updated_at
  BEFORE UPDATE ON project_budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_project_budget_items_updated_at();

DROP TRIGGER IF EXISTS update_project_milestones_updated_at ON project_milestones;
CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_project_milestones_updated_at();

DROP TRIGGER IF EXISTS check_circular_dependency_trigger ON task_dependencies;
CREATE TRIGGER check_circular_dependency_trigger
  BEFORE INSERT ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_dependency();

-- ============================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- ============================================
-- USERS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Users can view active users" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view active users" ON users
  FOR SELECT USING ("isActive" = true);

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (is_current_user_admin());

-- ============================================
-- DEPARTMENTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view departments" ON departments;
DROP POLICY IF EXISTS "Admins and managers can manage departments" ON departments;

CREATE POLICY "Users can view departments" ON departments
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage departments" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
    )
  );

-- ============================================
-- TEAMS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view teams" ON teams;
DROP POLICY IF EXISTS "Admins and managers can manage teams" ON teams;

CREATE POLICY "Users can view teams" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
    )
  );

-- ============================================
-- ALLOWED DOMAINS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can view allowed domains" ON allowed_domains;
DROP POLICY IF EXISTS "Admins can manage allowed domains" ON allowed_domains;

CREATE POLICY "Admins can view allowed domains" ON allowed_domains
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage allowed domains" ON allowed_domains
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- TAGS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view tags" ON tags;
DROP POLICY IF EXISTS "Admins and managers can manage tags" ON tags;

CREATE POLICY "Users can view tags" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage tags" ON tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
    )
  );

-- ============================================
-- PROJECT TAGS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view project tags" ON project_tags;
DROP POLICY IF EXISTS "Admins and managers can manage project tags" ON project_tags;

CREATE POLICY "Users can view project tags" ON project_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage project tags" ON project_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
    )
  );

-- ============================================
-- TASK TAGS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view task tags" ON task_tags;
DROP POLICY IF EXISTS "Admins and managers can manage task tags" ON task_tags;

CREATE POLICY "Users can view task tags" ON task_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage task tags" ON task_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
    )
  );

-- ============================================
-- PROJECTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = "createdBy");

CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = "createdBy");

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = "createdBy");

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = "createdBy");

-- ============================================
-- PROJECT MEMBERS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Project owners can update members" ON project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON project_members;

CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (
    "userId" = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members."projectId"
      AND projects."createdBy" = auth.uid()
    )
  );

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

-- ============================================
-- TASKS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON tasks;

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

-- ============================================
-- TIME ENTRIES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON time_entries;

CREATE POLICY "Users can view their own time entries" ON time_entries
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can create their own time entries" ON time_entries
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own time entries" ON time_entries
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own time entries" ON time_entries
  FOR DELETE USING (auth.uid() = "userId");

-- ============================================
-- MEETINGS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can create their own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can update their own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can delete their own meetings" ON meetings;

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

-- ============================================
-- AI SUGGESTIONS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view suggestions for their meetings" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can create suggestions for their meetings" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can update suggestions for their meetings" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can delete suggestions for their meetings" ON ai_suggestions;

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

-- ============================================
-- TASK DEPENDENCIES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view task dependencies" ON task_dependencies;
DROP POLICY IF EXISTS "Users can create task dependencies" ON task_dependencies;
DROP POLICY IF EXISTS "Users can delete task dependencies" ON task_dependencies;

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

-- ============================================
-- TASK COMMENTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Users can create task comments" ON task_comments;
DROP POLICY IF EXISTS "Users can update their own task comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete task comments" ON task_comments;

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

CREATE POLICY "Users can update their own task comments"
  ON task_comments FOR UPDATE
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

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

-- ============================================
-- TASK ATTACHMENTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view task attachments" ON task_attachments;
DROP POLICY IF EXISTS "Users can upload task attachments" ON task_attachments;
DROP POLICY IF EXISTS "Users can delete task attachments" ON task_attachments;

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
-- NOTIFICATIONS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications for themselves" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING ("userId" = auth.uid());

CREATE POLICY "Users can create notifications for themselves"
  ON notifications FOR INSERT
  WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING ("userId" = auth.uid());

-- ============================================
-- USER NOTIFICATION PREFERENCES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON user_notification_preferences;

CREATE POLICY "Users can view their own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING ("userId" = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
  ON user_notification_preferences FOR INSERT
  WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
  ON user_notification_preferences FOR UPDATE
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- ============================================
-- USER WEEKLY HOURS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own weekly hours" ON user_weekly_hours;
DROP POLICY IF EXISTS "Admins can manage weekly hours" ON user_weekly_hours;

CREATE POLICY "Users can view own weekly hours" ON user_weekly_hours
  FOR SELECT USING (
    "userId" = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage weekly hours" ON user_weekly_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- PROJECT RISKS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view project risks" ON project_risks;
DROP POLICY IF EXISTS "Users can create project risks" ON project_risks;
DROP POLICY IF EXISTS "Users can update project risks" ON project_risks;
DROP POLICY IF EXISTS "Users can delete project risks" ON project_risks;

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

-- ============================================
-- PROJECT BUDGET ITEMS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view project budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Users can create project budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Users can update project budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Users can delete project budget items" ON project_budget_items;

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

-- ============================================
-- PROJECT MILESTONES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view project milestones" ON project_milestones;
DROP POLICY IF EXISTS "Users can create project milestones" ON project_milestones;
DROP POLICY IF EXISTS "Users can update project milestones" ON project_milestones;
DROP POLICY IF EXISTS "Users can delete project milestones" ON project_milestones;

CREATE POLICY "Users can view project milestones"
  ON project_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones."projectId"
      AND p."createdBy" = auth.uid()
    )
    OR "createdBy" = auth.uid()
  );

CREATE POLICY "Users can create project milestones"
  ON project_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones."projectId"
      AND p."createdBy" = auth.uid()
    )
    AND "createdBy" = auth.uid()
  );

CREATE POLICY "Users can update project milestones"
  ON project_milestones FOR UPDATE
  USING (
    "createdBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones."projectId"
      AND p."createdBy" = auth.uid()
    )
  );

CREATE POLICY "Users can delete project milestones"
  ON project_milestones FOR DELETE
  USING (
    "createdBy" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones."projectId"
      AND p."createdBy" = auth.uid()
    )
  );

-- ============================================
-- PROJECT REPORTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view reports for their projects" ON project_reports;
DROP POLICY IF EXISTS "Users can create reports for their projects" ON project_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON project_reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON project_reports;

CREATE POLICY "Users can view reports for their projects"
  ON project_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_reports."projectId" 
      AND projects."createdBy" = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks."projectId" = project_reports."projectId" 
      AND tasks."assignedTo" = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create reports for their projects"
  ON project_reports FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_reports."projectId" 
        AND projects."createdBy" = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks."projectId" = project_reports."projectId" 
        AND tasks."assignedTo" = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
      )
    )
    AND "generatedBy" = auth.uid()
  );

CREATE POLICY "Users can update their own reports"
  ON project_reports FOR UPDATE
  USING ("generatedBy" = auth.uid())
  WITH CHECK ("generatedBy" = auth.uid());

CREATE POLICY "Users can delete their own reports"
  ON project_reports FOR DELETE
  USING ("generatedBy" = auth.uid());

-- ============================================
-- SETTINGS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can view settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON settings;

CREATE POLICY "Admins can view settings" ON settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update settings" ON settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert settings" ON settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- 13. INITIAL DATA (Optional)
-- ============================================

-- Insert default tags
INSERT INTO tags (name, color, category, description) VALUES
  ('Operations', '#ef4444', 'operations', 'Operations-related tasks and projects'),
  ('Vendor Management', '#f59e0b', 'vendor', 'Vendor management related items'),
  ('Internal BU', '#10b981', 'internal_bu', 'Internal Business Unit related'),
  ('IT Support', '#3b82f6', 'it', 'IT support and infrastructure'),
  ('HR', '#8b5cf6', 'hr', 'Human resources related')
ON CONFLICT (name) DO NOTHING;

-- Set default weekly hours for existing users
INSERT INTO user_weekly_hours ("userId", "weekStartDate", "availableHours")
SELECT 
  id,
  DATE_TRUNC('week', CURRENT_DATE)::DATE,
  40
FROM users
ON CONFLICT ("userId", "weekStartDate") DO NOTHING;

-- ============================================
-- END OF MIGRATION
-- ============================================
-- Notes:
-- 1. This migration is idempotent - it can be run multiple times safely
-- 2. All tables use quoted identifiers (camelCase) to preserve column names
-- 3. RLS policies are organized by table for easy reference
-- 4. All triggers and functions are included
-- 5. All indexes are created for optimal query performance
-- 6. After running, you may need to:
--    - Create an admin user: UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
--    - Sync existing auth users: SELECT sync_users_from_auth();
--    - Create storage bucket for task attachments (see task_attachments migration notes)
-- ============================================


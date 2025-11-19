-- Migration: Project Members and Task Visibility
-- Run this after the base migrations

-- ============================================
-- 1. PROJECT MEMBERS TABLE (for restricting project access)
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')),
  "addedBy" UUID REFERENCES auth.users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("projectId", "userId")
);

-- ============================================
-- 2. TASK VISIBILITY TABLE (for controlling who can see tasks)
-- ============================================
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
-- 3. SETTINGS TABLE (for API keys and model configuration)
-- ============================================
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

-- ============================================
-- 4. USER WEEKLY HOURS TABLE (for productivity calculation)
-- ============================================
CREATE TABLE IF NOT EXISTS user_weekly_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "weekStartDate" DATE NOT NULL,
  "availableHours" NUMERIC DEFAULT 40,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "weekStartDate")
);

-- ============================================
-- 5. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members("projectId");
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members("userId");
CREATE INDEX IF NOT EXISTS idx_task_visibility_task ON task_visibility("taskId");
CREATE INDEX IF NOT EXISTS idx_user_weekly_hours_user ON user_weekly_hours("userId");
CREATE INDEX IF NOT EXISTS idx_user_weekly_hours_week ON user_weekly_hours("weekStartDate");

-- ============================================
-- 6. RLS POLICIES
-- ============================================
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weekly_hours ENABLE ROW LEVEL SECURITY;

-- Project Members: Users can view members of projects they're part of or own
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (
    "userId" = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm."projectId" = project_members."projectId"
      AND pm."userId" = auth.uid()
    ) OR
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

-- Settings: Only admins can view and update
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

-- User Weekly Hours: Users can view their own hours, admins can view all
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
-- 7. DEFAULT WEEKLY HOURS FOR EXISTING USERS
-- ============================================
-- Set default 40 hours for current week for all existing users
INSERT INTO user_weekly_hours ("userId", "weekStartDate", "availableHours")
SELECT 
  id,
  DATE_TRUNC('week', CURRENT_DATE)::DATE,
  40
FROM users
ON CONFLICT ("userId", "weekStartDate") DO NOTHING;


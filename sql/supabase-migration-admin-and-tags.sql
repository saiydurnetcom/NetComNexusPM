-- Migration: Admin Panel, Teams, Departments, Allowed Domains, and Tags
-- Run this migration after the base migration

-- ============================================
-- 1. DEPARTMENTS TABLE (created first - no dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  createdBy UUID REFERENCES auth.users(id),
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USERS TABLE (created before teams, but references departments)
-- ============================================
-- This table syncs with auth.users and extends it with additional fields
-- Note: We'll add teamId and departmentId columns after teams table is created
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Add department reference (departments table exists now)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS departmentId UUID REFERENCES departments(id) ON DELETE SET NULL;

-- ============================================
-- 3. TEAMS TABLE (created after users and departments)
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  departmentId UUID REFERENCES departments(id) ON DELETE SET NULL,
  teamLeadId UUID REFERENCES users(id) ON DELETE SET NULL,
  createdBy UUID REFERENCES auth.users(id),
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Now add team reference to users table (teams table exists now)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS teamId UUID REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================
-- 4. ALLOWED DOMAINS TABLE (for self signup)
-- ============================================
CREATE TABLE IF NOT EXISTS allowed_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE, -- e.g., "company.com"
  isActive BOOLEAN DEFAULT true,
  autoAssignTeamId UUID REFERENCES teams(id) ON DELETE SET NULL,
  autoAssignDepartmentId UUID REFERENCES departments(id) ON DELETE SET NULL,
  createdBy UUID REFERENCES auth.users(id),
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6', -- Hex color code
  category TEXT, -- e.g., 'operations', 'vendor', 'internal_bu'
  description TEXT,
  createdBy UUID REFERENCES auth.users(id),
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. PROJECT TAGS (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS project_tags (
  projectId UUID REFERENCES projects(id) ON DELETE CASCADE,
  tagId UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (projectId, tagId),
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. TASK TAGS (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS task_tags (
  taskId UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tagId UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (taskId, tagId),
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. ADD TAGS COLUMN TO EXISTING TABLES (if needed)
-- ============================================
-- Note: We're using junction tables above, but if you prefer a simpler approach,
-- you could add a tags JSONB column instead. The junction table approach is more normalized.

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Users: Users can view all active users, admins can manage
CREATE POLICY "Users can view active users" ON users
  FOR SELECT USING (isActive = true OR auth.uid() = id);

CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Departments: All authenticated users can view, admins/managers can manage
CREATE POLICY "Users can view departments" ON departments
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage departments" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Teams: All authenticated users can view, admins/managers can manage
CREATE POLICY "Users can view teams" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Allowed Domains: Only admins can view and manage
CREATE POLICY "Admins can view allowed domains" ON allowed_domains
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage allowed domains" ON allowed_domains
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tags: All authenticated users can view, admins/managers can manage
CREATE POLICY "Users can view tags" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage tags" ON tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Project Tags: Users can view, admins/managers can manage
CREATE POLICY "Users can view project tags" ON project_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage project tags" ON project_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Task Tags: Users can view, admins/managers can manage
CREATE POLICY "Users can view task tags" ON task_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage task tags" ON task_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ============================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_team ON users(teamId);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(departmentId);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(departmentId);
CREATE INDEX IF NOT EXISTS idx_project_tags_project ON project_tags(projectId);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON project_tags(tagId);
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(taskId);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tagId);
CREATE INDEX IF NOT EXISTS idx_allowed_domains_domain ON allowed_domains(domain);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

-- ============================================
-- 11. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allowed_domains_updated_at BEFORE UPDATE ON allowed_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to sync auth.users with users table
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, "firstName", "lastName", "createdAt")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    "updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync new auth users (if trigger doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_from_auth();

-- ============================================
-- 12. INITIAL DATA (Optional - for testing)
-- ============================================

-- Insert some default tags
INSERT INTO tags (name, color, category, description) VALUES
  ('Operations', '#ef4444', 'operations', 'Operations-related tasks and projects'),
  ('Vendor Management', '#f59e0b', 'vendor', 'Vendor management related items'),
  ('Internal BU', '#10b981', 'internal_bu', 'Internal Business Unit related'),
  ('IT Support', '#3b82f6', 'it', 'IT support and infrastructure'),
  ('HR', '#8b5cf6', 'hr', 'Human resources related')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- NOTES:
-- ============================================
-- 1. After running this migration, you'll need to:
--    - Create an admin user manually or through Supabase dashboard
--    - Set up initial departments and teams
--    - Configure allowed domains for self signup
--
-- 2. To create an admin user:
--    UPDATE users SET role = 'admin' WHERE email = 'admin@yourcompany.com';
--
-- 3. The sync_user_from_auth function will automatically create user records
--    when new users sign up, but you may need to manually sync existing users:
--    INSERT INTO users (id, email, "firstName", "lastName", "createdAt")
--    SELECT id, email, 
--           COALESCE(raw_user_meta_data->>'firstName', ''),
--           COALESCE(raw_user_meta_data->>'lastName', ''),
--           created_at
--    FROM auth.users
--    ON CONFLICT (id) DO NOTHING;


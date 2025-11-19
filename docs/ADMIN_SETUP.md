# Admin Setup Guide

## Making Yourself an Admin

Since you're the only user currently, you need to set your role to 'admin' in the database. Here are the steps:

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. **First, check what columns exist in your users table:**

```sql
-- Check the users table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
```

4. **Then run the appropriate SQL based on your table structure:**

**If your table has camelCase columns (firstName, lastName):**

```sql
-- Make yourself admin (if user already exists)
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- If the users table doesn't have your user yet, sync from auth.users first:
INSERT INTO users (id, email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'firstName', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'lastName', ''),
  'admin',
  true,
  created_at,
  NOW()
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

**If your table has snake_case columns (first_name, last_name):**

```sql
-- Make yourself admin (if user already exists)
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- If the users table doesn't have your user yet:
INSERT INTO users (id, email, first_name, last_name, role, is_active, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'firstName', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'lastName', ''),
  'admin',
  true,
  created_at,
  NOW()
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

**If the users table doesn't exist yet, run the migration first:**

Run `supabase-migration-admin-and-tags.sql` to create the users table with the correct schema.

**Important:** After setting your role to 'admin' in the users table:
1. **Log out and log back in** - The app now reads the role from the `users` table, but you need to refresh your session
2. Or refresh the page - The app will automatically fetch your role from the database on page load
3. You should now see the "Admin" link in the navigation menu

### Option 2: Using Admin Panel (After First Admin is Created)

1. Once you have admin access, go to `/admin`
2. Click "Sync from Auth" to sync all users from authentication
3. Find your user in the table
4. Click the Edit button
5. Change your role to "Admin"
6. Save

## Running Required Migrations

Before using admin features, make sure you've run these migrations in order:

1. `supabase-migration.sql` (base tables)
2. `supabase-migration-admin-and-tags.sql` (admin tables, teams, departments, tags)
3. `supabase-migration-project-purpose.sql` (project purpose and resources)
4. `supabase-migration-task-reviewer-attachments.sql` (task reviewer and attachments)
5. `supabase-migration-project-members-visibility.sql` (project members, task visibility, settings, weekly hours)

## Features Available in Admin Panel

### Users Management
- View all users
- Edit user roles (member, manager, admin)
- Assign users to teams and departments
- Activate/deactivate users
- Sync users from authentication

### Teams Management
- Create and manage teams
- Assign team leads
- Link teams to departments

### Departments Management
- Create and manage departments
- Organize teams under departments

### Allowed Domains
- Configure which email domains are allowed for self-signup
- Auto-assign teams/departments based on domain

### Tags Management
- Create and manage tags for tasks and projects
- Set tag colors and categories

### Settings
- Manage AI API keys and URLs
- Configure AI models
- Manage Supabase configuration
- Note: These settings are stored in the database. For production, you may still need to set environment variables in Vercel.

## Productivity Calculation

Productivity is now calculated based on:
- **Available Hours**: Default 40 hours per week per user (configurable in `user_weekly_hours` table)
- **Actual Hours**: Time tracked in time entries for the current week
- **Formula**: `(Actual Hours / Available Hours) * 100`

The system automatically creates weekly hour records for users. You can adjust individual user's available hours in the database if needed.

## Project Member Restrictions

Projects can now be restricted to specific members:
- Use the `project_members` table to add members to projects
- Only project members can view and work on restricted projects
- Project owners and admins can add/remove members

## Task Visibility

Tasks can have visibility controls:
- **Members**: Visible to project members
- **Team Managers**: Visible to team managers
- **Upline Managers**: Visible to department managers
- **All**: Visible to everyone (default)

Configure task visibility using the `task_visibility` table.


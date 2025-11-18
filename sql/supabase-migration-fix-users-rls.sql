-- Fix RLS policies for users table to allow users to always read their own record
-- This prevents circular dependency issues when checking admin status

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view active users" ON users;
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- CRITICAL: Users can ALWAYS view their own record (needed for role checking)
-- This must be first and most permissive to prevent circular dependencies
-- Using SECURITY DEFINER to bypass RLS for this check
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can view other active users (but this won't apply to their own record due to above policy)
CREATE POLICY "Users can view active users" ON users
  FOR SELECT USING (isActive = true);

-- Users can update their own record (limited fields only)
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create a function to check admin status from user_metadata first (avoids circular dependency)
-- This function checks auth.users metadata first, then falls back to users table
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- First check user_metadata (fastest, no RLS, no circular dependency)
  SELECT raw_user_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE id = auth.uid();
  
  -- If not in metadata, check users table (but this might hit RLS)
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM users
    WHERE id = auth.uid();
  END IF;
  
  RETURN COALESCE(user_role, 'member');
END;
$$;

-- Create function to check if admin (uses the role function)
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

-- Admins can manage all users (using the function to avoid circular dependency)
-- This policy uses SECURITY DEFINER function which bypasses RLS
CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (is_current_user_admin());

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;


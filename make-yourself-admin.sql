-- Quick script to make yourself admin
-- Replace 'your-email@example.com' with your actual email

-- Step 1: Ensure users table exists with correct columns
-- If you get column errors, run fix-users-table-columns.sql first

-- Step 2: Check if your user exists in users table
SELECT * FROM users WHERE email = 'your-email@example.com';

-- Step 3a: If user exists, just update role
UPDATE users 
SET role = 'admin', "updatedAt" = NOW()
WHERE email = 'your-email@example.com';

-- Step 3b: If user doesn't exist, create it from auth.users
-- This will work regardless of column naming (camelCase or snake_case)
DO $$
DECLARE
  user_email TEXT := 'your-email@example.com';
  user_id UUID;
  first_name_val TEXT;
  last_name_val TEXT;
BEGIN
  -- Get user from auth.users
  SELECT id, 
         COALESCE(raw_user_meta_data->>'firstName', split_part(email, '@', 1)),
         COALESCE(raw_user_meta_data->>'lastName', '')
  INTO user_id, first_name_val, last_name_val
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NOT NULL THEN
    -- Try camelCase first
    BEGIN
      INSERT INTO users (id, email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
      VALUES (user_id, user_email, first_name_val, last_name_val, 'admin', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET role = 'admin', "updatedAt" = NOW();
    EXCEPTION WHEN OTHERS THEN
      -- If camelCase fails, try snake_case
      BEGIN
        INSERT INTO users (id, email, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES (user_id, user_email, first_name_val, last_name_val, 'admin', true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = NOW();
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not insert user. Please check table structure.';
      END;
    END;
  ELSE
    RAISE NOTICE 'User not found in auth.users with email: %', user_email;
  END IF;
END $$;

-- Step 4: Verify you're now admin
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';


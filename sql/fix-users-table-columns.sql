-- Fix users table columns if they were created with wrong naming
-- Run this if you get column name errors

-- Check current structure first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';

-- If columns are snake_case, rename them to camelCase (if needed)
-- Uncomment and run these if your columns are named differently:

-- ALTER TABLE users RENAME COLUMN first_name TO "firstName";
-- ALTER TABLE users RENAME COLUMN last_name TO "lastName";
-- ALTER TABLE users RENAME COLUMN is_active TO "isActive";
-- ALTER TABLE users RENAME COLUMN created_at TO "createdAt";
-- ALTER TABLE users RENAME COLUMN updated_at TO "updatedAt";

-- OR if columns don't exist, add them:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "firstName" TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastName" TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

-- After fixing columns, make yourself admin:
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE email = 'your-email@example.com';


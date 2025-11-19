-- Migration: Fix auth trigger to use correct column names
-- The trigger function sync_user_from_auth() uses quoted camelCase column names
-- but PostgreSQL lowercases unquoted identifiers, so we need to fix the trigger

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS sync_user_from_auth();

-- Recreate the function with lowercase column names (matching actual database schema)
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Try lowercase first (PostgreSQL lowercases unquoted identifiers)
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
        -- Log the error but don't fail the auth user creation
        RAISE WARNING 'Failed to sync user to users table: %', SQLERRM;
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_from_auth();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_user_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_from_auth() TO service_role;


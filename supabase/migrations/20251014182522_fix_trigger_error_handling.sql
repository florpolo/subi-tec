/*
  # Fix Trigger Error Handling
  
  ## Problem
  
  The trigger might be failing silently, causing auth.users insert to fail.
  Need better error handling and logging.
  
  ## Solution
  
  1. Recreate trigger function with explicit error handling
  2. Use RAISE to log any errors
  3. Still return NEW even if insert fails (don't block user creation)
  
  ## Changes
  
  - Drop and recreate handle_new_user() with better error handling
  - Function will not throw errors, just log them
  - User creation will succeed even if membership creation fails
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_join_code text;
  v_role text;
  v_company_id uuid;
BEGIN
  -- Extract metadata
  v_join_code := NEW.raw_user_meta_data->>'join_code';
  v_role := NEW.raw_user_meta_data->>'role';
  v_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;

  -- Only proceed if all required data is present
  IF v_join_code IS NOT NULL AND v_role IS NOT NULL AND v_company_id IS NOT NULL THEN
    BEGIN
      -- Try to insert membership
      INSERT INTO company_members (user_id, company_id, role)
      VALUES (NEW.id, v_company_id, v_role)
      ON CONFLICT (company_id, user_id) DO NOTHING;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE WARNING 'Failed to create company membership for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    END;
  END IF;

  -- Always return NEW to allow user creation to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

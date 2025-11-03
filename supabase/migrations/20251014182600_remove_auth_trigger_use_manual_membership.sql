/*
  # Remove Auth Trigger - Use Manual Membership Creation
  
  ## Problem
  
  The auth trigger is causing "Database error saving new user" during sign-up.
  Even with SECURITY DEFINER and proper error handling, it's blocking user creation.
  
  ## Solution
  
  Remove the trigger completely and handle membership creation in application code
  after the user is successfully created.
  
  ## Changes
  
  1. Drop the trigger on auth.users
  2. Drop the handle_new_user function
  3. Application will create membership manually after sign-up succeeds
  
  ## Security
  
  - Still secure: RLS policies on company_members remain
  - Users can only create their own membership
  - Office users can add others
*/

-- Drop trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop function
DROP FUNCTION IF EXISTS handle_new_user();

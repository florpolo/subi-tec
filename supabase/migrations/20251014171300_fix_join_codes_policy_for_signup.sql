/*
  # Fix Join Codes Policy for Sign Up

  Allows unauthenticated users to view active join codes during sign-up process.
  
  ## Changes
  
  1. Drop existing restrictive policy
  2. Create new policy that allows both anonymous and authenticated users to view active join codes
  
  ## Security
  
  - Only active, non-expired codes are visible
  - This is necessary for the sign-up flow where users validate codes before authentication
  - Office users can still manage codes for their companies
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can view active join codes" ON company_join_codes;

-- Create new policy that allows unauthenticated (anon) users to view active codes
CREATE POLICY "Anyone can view active join codes"
  ON company_join_codes FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

/*
  # Fix Company Members Infinite Recursion

  The policy "Users can view members of their companies" was causing infinite recursion
  because it was querying company_members within a policy on company_members.

  ## Changes

  1. Drop the problematic policy
  2. Create a simpler policy that allows users to view their own memberships
  3. This is sufficient because users only need to see their own company memberships

  ## Security

  - Users can view company_member records where they are the user
  - This gives them access to their company information without recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members of their companies" ON company_members;

-- Create a simple policy that allows users to see their own memberships
CREATE POLICY "Users can view their own company memberships"
  ON company_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

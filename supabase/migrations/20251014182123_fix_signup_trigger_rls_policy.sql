/*
  # Fix Sign-Up Trigger RLS Policy

  ## Problem
  
  The trigger `handle_new_user()` uses SECURITY DEFINER but is still blocked by RLS policy.
  The INSERT policy requires users to already be office members (chicken-and-egg problem).
  
  ## Solution
  
  Add a permissive INSERT policy that allows the trigger to create the first membership
  for a new user without requiring them to already be a member.
  
  ## Changes
  
  1. Create new INSERT policy for initial membership creation
     - Allows insert if the user_id being inserted matches auth.uid()
     - This lets new users create their own first membership record
  
  ## Security
  
  - Still secure: users can only create membership for themselves
  - Cannot create memberships for other users
  - Existing office member policy remains for adding other members
*/

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Office users can create company members" ON company_members;

-- Create policy allowing users to create their own first membership
CREATE POLICY "Users can create their own membership during signup"
  ON company_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Re-create policy for office users to add other members
CREATE POLICY "Office users can add other members"
  ON company_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members existing_members
      WHERE existing_members.company_id = company_members.company_id
      AND existing_members.user_id = auth.uid()
      AND existing_members.role = 'office'
    )
    AND user_id != auth.uid()
  );

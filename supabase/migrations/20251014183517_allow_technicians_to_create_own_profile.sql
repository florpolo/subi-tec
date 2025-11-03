/*
  # Allow Technicians to Create Their Own Profile During Sign-Up

  ## Problem
  
  Technicians cannot create their own profile during sign-up because the only
  INSERT policy on the technicians table requires the user to have role = 'office'.
  
  During sign-up:
  1. New technician is created with role = 'technician' in company_members
  2. App tries to insert into technicians table
  3. RLS policy checks: "Is this user an office member?"
  4. NO - they're a technician member
  5. INSERT is blocked by RLS
  6. Technician profile is never created
  
  ## Solution
  
  Add a second INSERT policy that allows technicians to create their own profile.
  
  ## Changes
  
  1. New INSERT policy on technicians table
     - Allows technicians to create their own profile
     - Verifies user_id = auth.uid() (security)
     - Verifies they are a technician member of the company
     - Works together with existing office policy (permissive)
  
  ## Security
  
  - Technicians can only create profile for themselves (user_id = auth.uid())
  - Must be a technician member of the company
  - Cannot create profiles for other users
  - Office users can still create technician profiles (existing policy)
*/

-- Add policy for technicians to create their own profile during sign-up
CREATE POLICY "Technicians can create their own profile during signup"
  ON technicians FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.user_id = auth.uid()
      AND company_members.company_id = technicians.company_id
      AND company_members.role = 'technician'
    )
  );

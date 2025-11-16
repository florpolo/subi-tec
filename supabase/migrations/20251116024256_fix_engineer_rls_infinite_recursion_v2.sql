/*
  # Fix Engineer RLS Infinite Recursion

  ## Problem
  The RLS policies created circular dependencies:
  - engineers table policy checks engineer_company_memberships
  - engineer_company_memberships policy checks engineers table
  This creates infinite recursion.

  ## Solution
  Simplify the policies to avoid circular references by:
  1. Engineers table: Use direct user_id check (no subqueries to other tables)
  2. Memberships table: Use a helper function that bypasses RLS
  3. Only office users need complex queries, and they don't query engineers by user_id

  ## Changes
  - Drop all existing engineer-related policies
  - Create helper function to get engineer_id
  - Recreate them with simpler, non-recursive logic
*/

-- Step 1: Drop existing policies to start fresh
DROP POLICY IF EXISTS "Engineers can view their own profile" ON engineers;
DROP POLICY IF EXISTS "Engineers can update their own profile" ON engineers;
DROP POLICY IF EXISTS "Engineers can create their own profile" ON engineers;
DROP POLICY IF EXISTS "Office users can view engineers in their company" ON engineers;

DROP POLICY IF EXISTS "Engineers can view their own memberships" ON engineer_company_memberships;
DROP POLICY IF EXISTS "Engineers can create memberships via join code" ON engineer_company_memberships;
DROP POLICY IF EXISTS "Office users can view memberships for their company" ON engineer_company_memberships;
DROP POLICY IF EXISTS "Office users can remove engineers from their company" ON engineer_company_memberships;

DROP POLICY IF EXISTS "Engineers can create reports for companies they belong to" ON engineer_reports;
DROP POLICY IF EXISTS "Engineers can view their own reports" ON engineer_reports;
DROP POLICY IF EXISTS "Office users can view reports for their company" ON engineer_reports;
DROP POLICY IF EXISTS "Office users can update reports for their company" ON engineer_reports;

-- Step 2: Create simple, non-recursive policies for engineers table
-- Engineers can manage their own profile using direct user_id comparison
CREATE POLICY "Engineers can view own profile"
  ON engineers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Engineers can update own profile"
  ON engineers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Engineers can create own profile"
  ON engineers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Office users can view engineers through memberships
-- This is safe because office users don't query by user_id
CREATE POLICY "Office can view company engineers"
  ON engineers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engineer_company_memberships ecm
      INNER JOIN company_members cm ON cm.company_id = ecm.company_id
      WHERE ecm.engineer_id = engineers.id
        AND cm.user_id = auth.uid()
    )
  );

-- Step 3: Create policies for engineer_company_memberships
-- Use a helper function to get engineer_id by user_id to avoid recursion
CREATE OR REPLACE FUNCTION public.get_engineer_id_for_user(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM engineers WHERE user_id = user_uuid LIMIT 1;
$$;

-- Engineers can view their memberships
CREATE POLICY "Engineers view own memberships"
  ON engineer_company_memberships
  FOR SELECT
  TO authenticated
  USING (engineer_id = public.get_engineer_id_for_user(auth.uid()));

-- Engineers can create memberships with valid join codes
CREATE POLICY "Engineers join via code"
  ON engineer_company_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    engineer_id = public.get_engineer_id_for_user(auth.uid())
    AND
    EXISTS (
      SELECT 1 FROM company_join_codes
      WHERE company_id = engineer_company_memberships.company_id
        AND is_active = true
    )
  );

-- Office users can view memberships for their companies
CREATE POLICY "Office view company memberships"
  ON engineer_company_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_id = engineer_company_memberships.company_id
        AND user_id = auth.uid()
    )
  );

-- Office users can remove engineers from their company
CREATE POLICY "Office remove company engineers"
  ON engineer_company_memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_id = engineer_company_memberships.company_id
        AND user_id = auth.uid()
        AND role = 'office'
    )
  );

-- Step 4: Create policies for engineer_reports
CREATE POLICY "Engineers create reports"
  ON engineer_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    engineer_id = public.get_engineer_id_for_user(auth.uid())
    AND
    EXISTS (
      SELECT 1 FROM engineer_company_memberships
      WHERE engineer_id = engineer_reports.engineer_id
        AND company_id = engineer_reports.company_id
    )
  );

CREATE POLICY "Engineers view own reports"
  ON engineer_reports
  FOR SELECT
  TO authenticated
  USING (engineer_id = public.get_engineer_id_for_user(auth.uid()));

CREATE POLICY "Office view company reports"
  ON engineer_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_id = engineer_reports.company_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Office update company reports"
  ON engineer_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_id = engineer_reports.company_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_id = engineer_reports.company_id
        AND user_id = auth.uid()
    )
  );

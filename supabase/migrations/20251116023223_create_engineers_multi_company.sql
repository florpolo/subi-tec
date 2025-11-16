/*
  # Create Engineers with Multi-Company Support

  ## Overview
  Creates the engineer system to support one engineer working for multiple companies.
  This enables engineers to have a single auth account but join multiple companies via join codes.

  ## New Tables

  ### 1. engineers table
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users) - Links to their single auth account
  - `name` (text) - Engineer's full name
  - `contact` (text, nullable) - Contact information
  - `created_at` (timestamptz) - When profile was created
  - Note: No company_id - engineers are not tied to a single company

  ### 2. engineer_company_memberships table
  - `id` (uuid, primary key)
  - `engineer_id` (uuid, foreign key to engineers)
  - `company_id` (uuid, foreign key to companies)
  - `created_at` (timestamptz) - When they joined this company
  - Unique constraint on (engineer_id, company_id) to prevent duplicates
  - This enables many-to-many: one engineer can work for multiple companies

  ### 3. engineer_reports table
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key to companies) - Reports are always for a specific company
  - `engineer_id` (uuid, foreign key to engineers) - Who created the report
  - `address` (text) - Address/location for the report
  - `comments` (text, nullable) - Optional comments
  - `is_read` (boolean) - Whether office has reviewed it
  - `created_at` (timestamptz) - Auto-saved creation time

  ## Security (RLS)

  ### engineers table
  - Engineers can view, update, and create their own profile
  - Office users can view engineers that are members of their company

  ### engineer_company_memberships table
  - Engineers can view their own memberships
  - Engineers can create memberships when they join via valid join code
  - Office users can view memberships for their company
  - Office users can remove engineers from their company

  ### engineer_reports table
  - Engineers can create reports for companies they belong to
  - Engineers can view all their own reports (across all companies)
  - Office users can view and update reports for their company only

  ## Important Notes
  - Engineers use join codes to associate with companies (same pattern as office/technician)
  - An engineer can work for multiple companies with a single auth account
  - Office users see only engineers and reports for their company
*/

-- Step 1: Create engineers table (profile only, no company_id)
CREATE TABLE IF NOT EXISTS engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on engineers
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;

-- Step 2: Create engineer_company_memberships table (many-to-many)
CREATE TABLE IF NOT EXISTS engineer_company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id uuid NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(engineer_id, company_id)
);

-- Enable RLS on engineer_company_memberships
ALTER TABLE engineer_company_memberships ENABLE ROW LEVEL SECURITY;

-- Step 3: Create engineer_reports table
CREATE TABLE IF NOT EXISTS engineer_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  engineer_id uuid NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
  address text NOT NULL,
  comments text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on engineer_reports
ALTER TABLE engineer_reports ENABLE ROW LEVEL SECURITY;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_engineers_user_id ON engineers(user_id);
CREATE INDEX IF NOT EXISTS idx_engineer_company_memberships_engineer_id ON engineer_company_memberships(engineer_id);
CREATE INDEX IF NOT EXISTS idx_engineer_company_memberships_company_id ON engineer_company_memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_engineer_company_memberships_created_at ON engineer_company_memberships(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engineer_reports_company_id ON engineer_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_engineer_reports_engineer_id ON engineer_reports(engineer_id);
CREATE INDEX IF NOT EXISTS idx_engineer_reports_is_read ON engineer_reports(is_read);
CREATE INDEX IF NOT EXISTS idx_engineer_reports_created_at ON engineer_reports(created_at DESC);

-- Step 5: Create new RLS policies for engineers table
CREATE POLICY "Engineers can view their own profile"
  ON engineers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Engineers can update their own profile"
  ON engineers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Engineers can create their own profile"
  ON engineers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Office users can view engineers in their company"
  ON engineers
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT engineer_id
      FROM engineer_company_memberships
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

-- Step 6: Create RLS policies for engineer_company_memberships
CREATE POLICY "Engineers can view their own memberships"
  ON engineer_company_memberships
  FOR SELECT
  TO authenticated
  USING (
    engineer_id IN (
      SELECT id FROM engineers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Engineers can create memberships via join code"
  ON engineer_company_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    engineer_id IN (
      SELECT id FROM engineers WHERE user_id = auth.uid()
    )
    AND
    company_id IN (
      SELECT company_id FROM company_join_codes
      WHERE is_active = true
    )
  );

CREATE POLICY "Office users can view memberships for their company"
  ON engineer_company_memberships
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can remove engineers from their company"
  ON engineer_company_memberships
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM company_members
      WHERE user_id = auth.uid() AND role = 'office'
    )
  );

-- Step 7: Update RLS policies for engineer_reports
CREATE POLICY "Engineers can create reports for companies they belong to"
  ON engineer_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    engineer_id IN (
      SELECT id FROM engineers WHERE user_id = auth.uid()
    )
    AND
    company_id IN (
      SELECT company_id
      FROM engineer_company_memberships
      WHERE engineer_id IN (
        SELECT id FROM engineers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Engineers can view their own reports"
  ON engineer_reports
  FOR SELECT
  TO authenticated
  USING (
    engineer_id IN (
      SELECT id FROM engineers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can view reports for their company"
  ON engineer_reports
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can update reports for their company"
  ON engineer_reports
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

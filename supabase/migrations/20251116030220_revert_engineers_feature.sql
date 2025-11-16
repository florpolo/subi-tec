/*
  # Revert Engineers Feature

  This migration removes all engineer-related functionality that was breaking the app.

  1. Tables to Drop
    - `engineer_reports` - Reports created by engineers
    - `engineer_company_memberships` - Many-to-many relationship between engineers and companies
    - `engineers` - Engineer profiles

  2. Important Notes
    - This is a destructive operation that will delete all engineer data
    - The app will return to supporting only 'office' and 'technician' roles
    - No data migration is needed as the engineer feature was not working correctly
*/

-- Drop engineer_reports table (depends on engineers)
DROP TABLE IF EXISTS engineer_reports CASCADE;

-- Drop engineer_company_memberships table (depends on engineers)
DROP TABLE IF EXISTS engineer_company_memberships CASCADE;

-- Drop engineers table
DROP TABLE IF EXISTS engineers CASCADE;

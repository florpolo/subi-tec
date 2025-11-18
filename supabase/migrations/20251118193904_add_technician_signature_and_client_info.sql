/*
  # Add technician signature and client information fields

  1. Changes to work_orders table
    - Add `technician_signature_data_url` (text, nullable) - stores technician signature image URL
    - Add `client_dni` (text, nullable) - stores client DNI/ID number
    - Add `client_aclaracion` (text, nullable) - stores client name clarification (legible name)

  2. Notes
    - All new columns are nullable to maintain compatibility with existing data
    - No RLS changes needed as these follow the same access patterns as existing columns
*/

-- Add new columns to work_orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'technician_signature_data_url'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN technician_signature_data_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'client_dni'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN client_dni text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'client_aclaracion'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN client_aclaracion text;
  END IF;
END $$;
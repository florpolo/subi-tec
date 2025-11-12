-- Drop existing objects if they exist
DROP FUNCTION IF EXISTS get_next_remito_no(uuid);
DROP TABLE IF EXISTS remitos;
DROP TABLE IF EXISTS remito_counters;
DROP TABLE IF EXISTS remito_templates;

-- Create tables
CREATE TABLE remito_counters(
  company_id uuid PRIMARY KEY,
  last_number bigint NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE remitos(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  work_order_id uuid NOT NULL UNIQUE,
  remito_number text NOT NULL,
  file_url text,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, remito_number)
);

-- Create RPC function
CREATE OR REPLACE FUNCTION get_next_remito_no(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_last bigint;
  v_next bigint;
BEGIN
  LOOP
    -- upsert row if missing
    INSERT INTO remito_counters(company_id, last_number)
    VALUES (p_company_id, 0)
    ON CONFLICT (company_id) DO NOTHING;

    -- lock row and increment
    SELECT last_number INTO v_last
    FROM remito_counters
    WHERE company_id = p_company_id
    FOR UPDATE;

    v_next := coalesce(v_last, 0) + 1;

    UPDATE remito_counters
      SET last_number = v_next, updated_at = now()
    WHERE company_id = p_company_id;

    EXIT;
  END LOOP;

  -- return zero-padded 8-digit string
  RETURN lpad(v_next::text, 8, '0');
END;
$$;

-- Enable RLS
ALTER TABLE remito_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE remitos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all for company members on remito_counters" ON remito_counters
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM company_members WHERE company_id = remito_counters.company_id));

CREATE POLICY "Allow all for company members on remitos" ON remitos
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM company_members WHERE company_id = remitos.company_id));

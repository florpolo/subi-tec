-- Create remito_counters table
CREATE TABLE IF NOT EXISTS remito_counters (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  last_number bigint NOT NULL DEFAULT 0
);

-- Create remitos table
CREATE TABLE IF NOT EXISTS remitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL UNIQUE REFERENCES work_orders(id) ON DELETE CASCADE,
  remito_number text NOT NULL,
  file_url text,
  generated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_remitos_company_id ON remitos(company_id);
CREATE INDEX IF NOT EXISTS idx_remitos_work_order_id ON remitos(work_order_id);
CREATE INDEX IF NOT EXISTS idx_remitos_remito_number ON remitos(remito_number);

-- Create RPC function to get next remito number atomically
create or replace function public.get_next_remito_no(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_next bigint;
begin
  insert into public.remito_counters(company_id, last_number)
  values (p_company_id, 0)
  on conflict (company_id) do nothing;

  update public.remito_counters
  set last_number = last_number + 1
  where company_id = p_company_id
  returning last_number into v_next;

  return lpad(v_next::text, 8, '0');
end;
$$;

grant execute on function public.get_next_remito_no(uuid) to authenticated;

-- work_orders
drop policy if exists wo_select_company on public.work_orders;

create policy wo_select_company
on public.work_orders
for select
to authenticated
using (
  company_id::text = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'company_id','')
);

-- buildings
drop policy if exists bld_select_company on public.buildings;

create policy bld_select_company
on public.buildings
for select
to authenticated
using (
  company_id::text = coalesce(current_setting('request.jwt.claims', true)::jsonb->>'company_id','')
);

-- Enable RLS
ALTER TABLE remito_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE remitos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for remito_counters (only service role can access)
CREATE POLICY "Service role can manage remito_counters"
  ON remito_counters FOR ALL
  USING (false);

-- RLS Policies for remitos
CREATE POLICY "Users can view remitos from their company"
  ON remitos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = remitos.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert remitos for their company"
  ON remitos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = remitos.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update remitos for their company"
  ON remitos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = remitos.company_id
      AND company_members.user_id = auth.uid()
    )
  );

-- Create storage bucket for remitos
INSERT INTO storage.buckets (id, name, public)
VALUES ('remitos', 'remitos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for remitos bucket
CREATE POLICY "Users can upload remitos to their company folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'remitos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view remitos from their companies"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'remitos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete remitos from their companies"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'remitos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid()
    )
  );


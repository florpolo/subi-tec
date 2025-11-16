/*
  # Agregar tabla de ingenieros y reportes

  1. Nueva Tabla: engineers
    - `id` (uuid, primary key)
    - `company_id` (uuid, foreign key a companies)
    - `user_id` (uuid, foreign key a auth.users)
    - `name` (text, nombre del ingeniero)
    - `contact` (text, información de contacto)
    - `created_at` (timestamptz, fecha de creación)

  2. Nueva Tabla: engineer_reports
    - `id` (uuid, primary key)
    - `company_id` (uuid, foreign key a companies)
    - `engineer_id` (uuid, foreign key a engineers)
    - `address` (text, dirección del reporte)
    - `comments` (text, comentarios opcionales)
    - `is_read` (boolean, indica si fue revisado por office)
    - `created_at` (timestamptz, fecha de creación automática)

  3. Seguridad
    - Habilitar RLS en ambas tablas
    - Engineers pueden:
      - Ver su propio perfil
      - Crear reportes para su company_id y engineer_id
      - Ver solo sus propios reportes
    - Office users pueden:
      - Ver todos los ingenieros de su compañía
      - Ver todos los reportes de su compañía
      - Marcar reportes como leídos (actualizar is_read)
*/

-- Crear tabla de ingenieros
CREATE TABLE IF NOT EXISTS engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS en engineers
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para engineers
CREATE POLICY "Users can view engineers from their company"
  ON engineers
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Engineers can view their own profile"
  ON engineers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Office users can create engineers for their company"
  ON engineers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can update engineers from their company"
  ON engineers
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

-- Crear tabla de reportes de ingenieros
CREATE TABLE IF NOT EXISTS engineer_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  engineer_id uuid NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
  address text NOT NULL,
  comments text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS en engineer_reports
ALTER TABLE engineer_reports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para engineer_reports
CREATE POLICY "Engineers can create reports for their company"
  ON engineer_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    engineer_id IN (
      SELECT id FROM engineers WHERE user_id = auth.uid()
    )
    AND
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
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

CREATE POLICY "Office users can view all reports from their company"
  ON engineer_reports
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can update reports from their company"
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

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_engineers_company_id ON engineers(company_id);
CREATE INDEX IF NOT EXISTS idx_engineers_user_id ON engineers(user_id);
CREATE INDEX IF NOT EXISTS idx_engineer_reports_company_id ON engineer_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_engineer_reports_engineer_id ON engineer_reports(engineer_id);
CREATE INDEX IF NOT EXISTS idx_engineer_reports_is_read ON engineer_reports(is_read);
CREATE INDEX IF NOT EXISTS idx_engineer_reports_created_at ON engineer_reports(created_at DESC);

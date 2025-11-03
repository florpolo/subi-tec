/*
  # Agregar tabla de equipos

  1. Nueva Tabla
    - `equipments`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key a companies)
      - `building_id` (uuid, foreign key a buildings)
      - `type` (text, tipo de equipo: elevator, water_pump, freight_elevator, car_lift, dumbwaiter, camillero, other)
      - `name` (text, nombre del equipo)
      - `location_description` (text, ubicación/descripción del equipo)
      - `brand` (text, marca)
      - `model` (text, modelo)
      - `serial_number` (text, número de serie)
      - `capacity` (numeric, capacidad del equipo)
      - `status` (text, estado: fit, fit-needs-improvements, not-fit)
      - `created_at` (timestamptz, fecha de creación)
      - `updated_at` (timestamptz, fecha de actualización)

  2. Seguridad
    - Habilitar RLS en tabla `equipments`
    - Políticas para que usuarios autenticados solo accedan a equipos de su compañía
    - SELECT: usuarios pueden ver equipos de su compañía
    - INSERT: usuarios pueden crear equipos para su compañía
    - UPDATE: usuarios pueden actualizar equipos de su compañía
    - DELETE: usuarios pueden eliminar equipos de su compañía

  3. Índices
    - Índice en `company_id` para búsquedas rápidas
    - Índice en `building_id` para filtrado por edificio
*/

-- Crear tabla de equipos
CREATE TABLE IF NOT EXISTS equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('elevator', 'water_pump', 'freight_elevator', 'car_lift', 'dumbwaiter', 'camillero', 'other')),
  name text NOT NULL,
  location_description text NOT NULL,
  brand text,
  model text,
  serial_number text,
  capacity numeric,
  status text CHECK (status IN ('fit', 'fit-needs-improvements', 'not-fit')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view equipments from their company"
  ON equipments
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create equipments for their company"
  ON equipments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update equipments from their company"
  ON equipments
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

CREATE POLICY "Users can delete equipments from their company"
  ON equipments
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_equipments_company_id ON equipments(company_id);
CREATE INDEX IF NOT EXISTS idx_equipments_building_id ON equipments(building_id);
CREATE INDEX IF NOT EXISTS idx_equipments_type ON equipments(type);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_equipments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipments_updated_at
  BEFORE UPDATE ON equipments
  FOR EACH ROW
  EXECUTE FUNCTION update_equipments_updated_at();
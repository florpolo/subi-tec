/*
  # Agregar equipment_id a work_orders

  1. Cambios
    - Agregar columna `equipment_id` (uuid, nullable) a la tabla `work_orders`
    - Agregar foreign key constraint referenciando `equipments(id)`
    - Modificar constraint de `elevator_id` para que sea nullable (DROP NOT NULL)
    - Agregar check constraint para garantizar que al menos uno de `elevator_id` o `equipment_id` esté presente

  2. Seguridad
    - No se modifican políticas RLS existentes
    - La columna es nullable para mantener compatibilidad con órdenes existentes
*/

-- Hacer elevator_id nullable (para permitir OTs de equipos no ascensor)
ALTER TABLE work_orders 
  ALTER COLUMN elevator_id DROP NOT NULL;

-- Agregar columna equipment_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'equipment_id'
  ) THEN
    ALTER TABLE work_orders 
      ADD COLUMN equipment_id uuid REFERENCES equipments(id);
  END IF;
END $$;

-- Agregar constraint para garantizar que al menos uno esté presente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'work_orders_equipment_check' 
    AND table_name = 'work_orders'
  ) THEN
    ALTER TABLE work_orders
      ADD CONSTRAINT work_orders_equipment_check 
      CHECK (elevator_id IS NOT NULL OR equipment_id IS NOT NULL);
  END IF;
END $$;

/*
  # Agregar índice para equipment_id en work_orders

  1. Cambios
    - Crear índice en work_orders(equipment_id) para optimizar consultas

  2. Seguridad
    - Solo se crea el índice, no se modifican políticas RLS
*/

-- Crear índice para equipment_id si no existe
CREATE INDEX IF NOT EXISTS work_orders_equipment_id_idx ON work_orders(equipment_id);

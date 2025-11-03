/*
  # Auth Hooks and Test Data
  
  Sets up database triggers for handling magic link sign-ups and creates test data for verification.
  
  ## 1. Database Functions
  
  ### `handle_new_user()`
  - Automatically creates company membership when a new user signs up with magic link
  - Reads join_code, role, and company_id from user metadata
  - Creates membership record in company_members table
  
  ## 2. Triggers
  
  ### `on_auth_user_created`
  - Fires after a new user is inserted into auth.users
  - Calls handle_new_user() function to create membership
  
  ## 3. Test Data
  
  Creates two test companies with complete data isolation:
  
  ### Company 1: "Elevadores San Martin"
  - Join code: SANMARTIN2025
  - 2 buildings with 4 elevators total
  - 2 technicians
  - 4 work orders (various statuses)
  
  ### Company 2: "Ascensores Belgrano"
  - Join code: BELGRANO2025
  - 1 building with 3 elevators
  - 2 technicians
  - 3 work orders (various statuses)
  
  ## 4. Verification
  
  Test users can sign up with the join codes to verify:
  - Data isolation between companies
  - RLS policies work correctly
  - Users only see their company's data
*/

-- Create function to handle new user sign-up with magic link
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_join_code text;
  v_role text;
  v_company_id uuid;
BEGIN
  v_join_code := NEW.raw_user_meta_data->>'join_code';
  v_role := NEW.raw_user_meta_data->>'role';
  v_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;

  IF v_join_code IS NOT NULL AND v_role IS NOT NULL AND v_company_id IS NOT NULL THEN
    INSERT INTO company_members (user_id, company_id, role)
    VALUES (NEW.id, v_company_id, v_role)
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create test companies
INSERT INTO companies (id, name)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Elevadores San Martin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO companies (id, name)
VALUES ('b0000000-0000-0000-0000-000000000002', 'Ascensores Belgrano')
ON CONFLICT (id) DO NOTHING;

-- Create join codes
INSERT INTO company_join_codes (company_id, code, is_active)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'SANMARTIN2025', true),
  ('b0000000-0000-0000-0000-000000000002', 'BELGRANO2025', true)
ON CONFLICT (code) DO NOTHING;

-- Company 1 buildings
INSERT INTO buildings (id, company_id, address, neighborhood, contact_phone, entry_hours, client_name, relationship_start_date)
VALUES 
  ('a0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000001', 'Av. San Martin 1500', 'Palermo', '+54 11 4832-5500', 'Mon–Fri 9–17', 'Consorcio San Martin', '2023-01-15'),
  ('a0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000001', 'Calle Thames 2300', 'Palermo', '+54 11 4833-6600', 'Mon–Fri 8–18', 'Consorcio Thames', '2023-06-20')
ON CONFLICT (id) DO NOTHING;

-- Company 1 elevators
INSERT INTO elevators (id, company_id, building_id, number, location_description, has_two_doors, status, stops, capacity, machine_room_location, control_type)
VALUES 
  ('a0000000-0000-0000-0000-000000000201', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000101', 1, 'Entrance left', false, 'fit', 10, 450, 'Rooftop', 'Automatic'),
  ('a0000000-0000-0000-0000-000000000202', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000101', 2, 'Entrance right', true, 'fit-needs-improvements', 10, 450, 'Rooftop', 'Automatic'),
  ('a0000000-0000-0000-0000-000000000203', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000102', 1, 'Main lobby', false, 'fit', 8, 300, 'Basement', 'Semi-automatic'),
  ('a0000000-0000-0000-0000-000000000204', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000102', 2, 'Service entrance', false, 'fit', 8, 600, 'Basement', 'Manual')
ON CONFLICT (id) DO NOTHING;

-- Company 1 technicians
INSERT INTO technicians (id, company_id, name, specialty, contact, role)
VALUES 
  ('a0000000-0000-0000-0000-000000000301', 'a0000000-0000-0000-0000-000000000001', 'Carlos Rodríguez', 'Maintenance', '+54 11 5555-1111', 'Reclamista'),
  ('a0000000-0000-0000-0000-000000000302', 'a0000000-0000-0000-0000-000000000001', 'María Fernández', 'Repairs', '+54 11 5555-2222', 'Engrasador')
ON CONFLICT (id) DO NOTHING;

-- Company 1 work orders
INSERT INTO work_orders (id, company_id, claim_type, building_id, elevator_id, technician_id, contact_name, contact_phone, description, status, priority, created_at)
VALUES 
  ('a0000000-0000-0000-0000-000000000401', 'a0000000-0000-0000-0000-000000000001', 'Monthly Maintenance', 'a0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000201', 'a0000000-0000-0000-0000-000000000301', 'Juan Pérez', '+54 11 4444-1111', 'Routine monthly check', 'In Progress', 'Medium', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000402', 'a0000000-0000-0000-0000-000000000001', 'Corrective', 'a0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000202', 'a0000000-0000-0000-0000-000000000302', 'Ana López', '+54 11 4444-2222', 'Door sensor malfunction', 'Pending', 'High', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000403', 'a0000000-0000-0000-0000-000000000001', 'Semiannual Tests', 'a0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000203', 'a0000000-0000-0000-0000-000000000301', 'Pedro Martínez', '+54 11 4444-3333', 'Safety inspection', 'Pending', 'Low', now() - interval '3 days'),
  ('a0000000-0000-0000-0000-000000000404', 'a0000000-0000-0000-0000-000000000001', 'Monthly Maintenance', 'a0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000204', 'a0000000-0000-0000-0000-000000000302', 'Laura García', '+54 11 4444-4444', 'Lubrication service', 'Completed', 'Low', now() - interval '10 days')
ON CONFLICT (id) DO NOTHING;

-- Company 2 buildings
INSERT INTO buildings (id, company_id, address, neighborhood, contact_phone, entry_hours, client_name, relationship_start_date)
VALUES 
  ('b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000002', 'Av. Cabildo 3400', 'Belgrano', '+54 11 4788-9900', 'Mon–Fri 10–16', 'Consorcio Cabildo', '2024-02-10')
ON CONFLICT (id) DO NOTHING;

-- Company 2 elevators
INSERT INTO elevators (id, company_id, building_id, number, location_description, has_two_doors, status, stops, capacity, machine_room_location, control_type)
VALUES 
  ('b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000101', 1, 'Tower A entrance', false, 'fit', 15, 650, 'Rooftop', 'Automatic'),
  ('b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000101', 2, 'Tower B entrance', true, 'not-fit', 15, 650, 'Rooftop', 'Automatic'),
  ('b0000000-0000-0000-0000-000000000203', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000101', 3, 'Service area', false, 'fit', 15, 500, 'Rooftop', 'Manual')
ON CONFLICT (id) DO NOTHING;

-- Company 2 technicians
INSERT INTO technicians (id, company_id, name, specialty, contact, role)
VALUES 
  ('b0000000-0000-0000-0000-000000000301', 'b0000000-0000-0000-0000-000000000002', 'Diego Sánchez', 'Installation', '+54 11 5555-3333', 'Reclamista'),
  ('b0000000-0000-0000-0000-000000000302', 'b0000000-0000-0000-0000-000000000002', 'Sofía Torres', 'Maintenance', '+54 11 5555-4444', 'Engrasador')
ON CONFLICT (id) DO NOTHING;

-- Company 2 work orders
INSERT INTO work_orders (id, company_id, claim_type, corrective_type, building_id, elevator_id, technician_id, contact_name, contact_phone, description, status, priority, created_at)
VALUES 
  ('b0000000-0000-0000-0000-000000000401', 'b0000000-0000-0000-0000-000000000002', 'Corrective', 'Refurbishment', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000202', 'b0000000-0000-0000-0000-000000000301', 'Roberto Silva', '+54 11 4444-5555', 'Complete overhaul needed', 'Pending', 'High', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO work_orders (id, company_id, claim_type, building_id, elevator_id, technician_id, contact_name, contact_phone, description, status, priority, created_at)
VALUES 
  ('b0000000-0000-0000-0000-000000000402', 'b0000000-0000-0000-0000-000000000002', 'Monthly Maintenance', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000302', 'Isabel Moreno', '+54 11 4444-6666', 'Regular maintenance', 'In Progress', 'Medium', now() - interval '3 days'),
  ('b0000000-0000-0000-0000-000000000403', 'b0000000-0000-0000-0000-000000000002', 'Semiannual Tests', 'b0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000203', 'b0000000-0000-0000-0000-000000000301', 'Miguel Vargas', '+54 11 4444-7777', 'Annual inspection', 'Completed', 'Low', now() - interval '15 days')
ON CONFLICT (id) DO NOTHING;

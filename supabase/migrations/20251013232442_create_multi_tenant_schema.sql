/*
  # Multi-Tenant Architecture Setup
  
  Creates the foundational schema for a multi-tenant elevator maintenance application.
  
  ## 1. New Tables
  
  ### `companies`
  - `id` (uuid, primary key) - Unique company identifier
  - `name` (text) - Company name
  - `created_at` (timestamptz) - When company was created
  
  ### `company_members`
  - `id` (uuid, primary key) - Unique membership identifier
  - `company_id` (uuid, foreign key) - References companies table
  - `user_id` (uuid, foreign key) - References auth.users
  - `role` (text) - User role within company: 'office' or 'technician'
  - `created_at` (timestamptz) - When membership was created
  - Unique constraint on (company_id, user_id) - Prevents duplicate memberships
  
  ### `company_join_codes`
  - `id` (uuid, primary key) - Unique code identifier
  - `company_id` (uuid, foreign key) - References companies table
  - `code` (text, unique) - The actual join code string
  - `is_active` (boolean) - Whether code is currently valid
  - `created_at` (timestamptz) - When code was created
  - `expires_at` (timestamptz, nullable) - Optional expiration date
  
  ### `buildings`
  - `id` (uuid, primary key) - Unique building identifier
  - `company_id` (uuid, foreign key) - References companies table
  - `address` (text) - Building address
  - `neighborhood` (text) - Neighborhood name
  - `contact_phone` (text) - Contact phone number
  - `entry_hours` (text) - Entry hours description
  - `client_name` (text) - Client name
  - `relationship_start_date` (date) - When relationship started
  - `created_at` (timestamptz) - When record was created
  
  ### `elevators`
  - `id` (uuid, primary key) - Unique elevator identifier
  - `company_id` (uuid, foreign key) - References companies table
  - `building_id` (uuid, foreign key) - References buildings table
  - `number` (integer) - Elevator number
  - `location_description` (text) - Physical location description
  - `has_two_doors` (boolean) - Whether elevator has two doors
  - `status` (text) - Status: 'fit', 'fit-needs-improvements', or 'not-fit'
  - `stops` (integer) - Number of stops
  - `capacity` (integer) - Capacity in kg
  - `machine_room_location` (text) - Machine room location
  - `control_type` (text) - Control type description
  - `created_at` (timestamptz) - When record was created
  
  ### `technicians`
  - `id` (uuid, primary key) - Unique technician identifier
  - `company_id` (uuid, foreign key) - References companies table
  - `user_id` (uuid, foreign key, nullable) - References auth.users (links to member)
  - `name` (text) - Technician name
  - `specialty` (text) - Technician specialty
  - `contact` (text) - Contact information
  - `role` (text) - Role: 'Reclamista' or 'Engrasador'
  - `created_at` (timestamptz) - When record was created
  
  ### `work_orders`
  - `id` (uuid, primary key) - Unique work order identifier
  - `company_id` (uuid, foreign key) - References companies table
  - `claim_type` (text) - Type of claim
  - `corrective_type` (text, nullable) - Type of corrective work if applicable
  - `building_id` (uuid, foreign key) - References buildings table
  - `elevator_id` (uuid, foreign key) - References elevators table
  - `technician_id` (uuid, foreign key, nullable) - References technicians table
  - `contact_name` (text) - Contact person name
  - `contact_phone` (text) - Contact phone number
  - `date_time` (timestamptz, nullable) - Scheduled date and time
  - `description` (text) - Work description
  - `status` (text) - Status: 'Pending', 'In Progress', or 'Completed'
  - `priority` (text) - Priority: 'Low', 'Medium', or 'High'
  - `created_at` (timestamptz) - When order was created
  - `start_time` (timestamptz, nullable) - When work started
  - `finish_time` (timestamptz, nullable) - When work finished
  - `comments` (text, nullable) - Additional comments
  - `parts_used` (jsonb, nullable) - Array of parts used
  - `photo_urls` (text[], nullable) - Array of photo URLs
  - `signature_data_url` (text, nullable) - Signature data URL
  
  ### `elevator_history`
  - `id` (uuid, primary key) - Unique history entry identifier
  - `company_id` (uuid, foreign key) - References companies table
  - `elevator_id` (uuid, foreign key) - References elevators table
  - `work_order_id` (uuid, foreign key) - References work_orders table
  - `date` (date) - Date of work
  - `description` (text) - Description of work performed
  - `technician_name` (text) - Name of technician
  - `created_at` (timestamptz) - When record was created
  
  ## 2. Security
  
  All tables have Row Level Security (RLS) enabled with policies ensuring:
  - Users can only access data for companies they are members of
  - Office role can create/update most data
  - Technician role has limited write access (mainly work orders assigned to them)
  - Company join codes can be read by anyone (for sign up) but only created by office users
  
  ## 3. Important Notes
  
  - All business tables include company_id for data isolation
  - Foreign key constraints ensure data integrity
  - Indexes on company_id for query performance
  - Default values set where appropriate
  - Cascade deletes configured to maintain referential integrity
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create company_members table
CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('office', 'technician')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Create company_join_codes table
CREATE TABLE IF NOT EXISTS company_join_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  address text NOT NULL,
  neighborhood text NOT NULL,
  contact_phone text NOT NULL,
  entry_hours text NOT NULL,
  client_name text NOT NULL,
  relationship_start_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create elevators table
CREATE TABLE IF NOT EXISTS elevators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  number integer NOT NULL,
  location_description text NOT NULL,
  has_two_doors boolean DEFAULT false,
  status text NOT NULL CHECK (status IN ('fit', 'fit-needs-improvements', 'not-fit')),
  stops integer NOT NULL,
  capacity integer NOT NULL,
  machine_room_location text NOT NULL,
  control_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create technicians table
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  specialty text NOT NULL,
  contact text NOT NULL,
  role text NOT NULL CHECK (role IN ('Reclamista', 'Engrasador')),
  created_at timestamptz DEFAULT now()
);

-- Create work_orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  claim_type text NOT NULL,
  corrective_type text,
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  elevator_id uuid NOT NULL REFERENCES elevators(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES technicians(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  date_time timestamptz,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
  created_at timestamptz DEFAULT now(),
  start_time timestamptz,
  finish_time timestamptz,
  comments text,
  parts_used jsonb,
  photo_urls text[],
  signature_data_url text
);

-- Create elevator_history table
CREATE TABLE IF NOT EXISTS elevator_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  elevator_id uuid NOT NULL REFERENCES elevators(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text NOT NULL,
  technician_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_join_codes_code ON company_join_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_buildings_company_id ON buildings(company_id);
CREATE INDEX IF NOT EXISTS idx_elevators_company_id ON elevators(company_id);
CREATE INDEX IF NOT EXISTS idx_elevators_building_id ON elevators(building_id);
CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON technicians(company_id);
CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician_id ON work_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_building_id ON work_orders(building_id);
CREATE INDEX IF NOT EXISTS idx_elevator_history_company_id ON elevator_history(company_id);
CREATE INDEX IF NOT EXISTS idx_elevator_history_elevator_id ON elevator_history(elevator_id);

-- Enable Row Level Security on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_join_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevators ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevator_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view companies they are members of"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = companies.id
      AND company_members.user_id = auth.uid()
    )
  );

-- RLS Policies for company_members
CREATE POLICY "Users can view members of their companies"
  ON company_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members AS cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can create company members"
  ON company_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = company_members.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

-- RLS Policies for company_join_codes
CREATE POLICY "Anyone can view active join codes"
  ON company_join_codes FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Office users can manage join codes for their companies"
  ON company_join_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = company_join_codes.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

-- RLS Policies for buildings
CREATE POLICY "Users can view buildings in their companies"
  ON buildings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = buildings.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can create buildings"
  ON buildings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = buildings.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

CREATE POLICY "Office users can update buildings"
  ON buildings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = buildings.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = buildings.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

-- RLS Policies for elevators
CREATE POLICY "Users can view elevators in their companies"
  ON elevators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = elevators.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can create elevators"
  ON elevators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = elevators.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

CREATE POLICY "Office users can update elevators"
  ON elevators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = elevators.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = elevators.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

-- RLS Policies for technicians
CREATE POLICY "Users can view technicians in their companies"
  ON technicians FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = technicians.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can create technicians"
  ON technicians FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = technicians.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

CREATE POLICY "Office users can update technicians"
  ON technicians FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = technicians.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = technicians.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

-- RLS Policies for work_orders
CREATE POLICY "Users can view work orders in their companies"
  ON work_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = work_orders.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can create work orders"
  ON work_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = work_orders.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

CREATE POLICY "Office users can update work orders"
  ON work_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = work_orders.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = work_orders.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

CREATE POLICY "Technicians can update their assigned work orders"
  ON work_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      JOIN technicians ON technicians.user_id = company_members.user_id
      WHERE company_members.company_id = work_orders.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'technician'
      AND technicians.id = work_orders.technician_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      JOIN technicians ON technicians.user_id = company_members.user_id
      WHERE company_members.company_id = work_orders.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'technician'
      AND technicians.id = work_orders.technician_id
    )
  );

-- RLS Policies for elevator_history
CREATE POLICY "Users can view elevator history in their companies"
  ON elevator_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = elevator_history.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Office users can create elevator history"
  ON elevator_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = elevator_history.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'office'
    )
  );

CREATE POLICY "Technicians can create elevator history for their work"
  ON elevator_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = elevator_history.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role = 'technician'
    )
  );
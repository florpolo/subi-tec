-- A. Single shared template (one default row used by all companies)
create table if not exists remito_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Shared Default Template',
  template_html text,                -- or template_json if you prefer a structured model
  is_default boolean not null default true,
  updated_at timestamp with time zone default now()
);

-- B. Company-scoped counter
create table if not exists remito_counters (
  company_id uuid primary key,
  last_number bigint not null default 0,
  updated_at timestamp with time zone default now()
);

-- C. Generated remitos (audit trail)
create table if not exists remitos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  work_order_id uuid not null unique,        -- one remito per work order
  remito_number text not null,               -- e.g., "00000042"
  generated_at timestamp with time zone default now(),
  foreign key (work_order_id) references work_orders(id) on delete cascade
);

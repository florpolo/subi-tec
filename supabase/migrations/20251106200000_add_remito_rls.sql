
alter table remito_counters enable row level security;
alter table remito_templates enable row level security;
alter table remitos enable row level security;

create policy "Allow all for company members" on remito_counters
  for all
  using (auth.uid() in (select user_id from company_members where company_id = remito_counters.company_id));

create policy "Allow all for company members" on remito_templates
  for all
  using (auth.uid() in (select user_id from company_members where company_id = remito_templates.company_id));

create policy "Allow all for company members" on remitos
  for all
  using (auth.uid() in (select user_id from company_members where company_id = remitos.company_id));

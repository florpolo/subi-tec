create or replace function get_next_remito_no(p_company_id uuid)
returns text
language plpgsql
as $$
declare
  v_last bigint;
  v_next bigint;
begin
  loop
    -- upsert row if missing
    insert into remito_counters(company_id, last_number)
    values (p_company_id, 0)
    on conflict (company_id) do nothing;

    -- lock row and increment
    select last_number into v_last
    from remito_counters
    where company_id = p_company_id
    for update;

    v_next := coalesce(v_last, 0) + 1;

    update remito_counters
      set last_number = v_next, updated_at = now()
    where company_id = p_company_id;

    exit;
  end loop;

  -- return zero-padded 8-digit string
  return lpad(v_next::text, 8, '0');
end;
$$;

-- supabase/migrations/20251111100000_complete_work_order_rpc.sql

-- Drop the function if it already exists to allow re-running migrations
DROP FUNCTION IF EXISTS public.complete_work_order(
    _work_order_id uuid,
    _company_id uuid,
    _comments text,
    _parts_used jsonb,
    _photo_urls text[],
    _signature_data_url text,
    _force_overwrite_finish_time boolean
);

-- Create the RPC function to complete a work order
CREATE OR REPLACE FUNCTION public.complete_work_order(
    _work_order_id uuid,
    _company_id uuid,
    _comments text DEFAULT NULL,
    _parts_used jsonb DEFAULT NULL,
    _photo_urls text[] DEFAULT NULL,
    _signature_data_url text DEFAULT NULL,
    _force_overwrite_finish_time boolean DEFAULT FALSE
)
RETURNS SETOF public.work_orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_work_order public.work_orders;
BEGIN
    -- Check if the work order exists and belongs to the company
    SELECT * INTO current_work_order
    FROM public.work_orders
    WHERE id = _work_order_id AND company_id = _company_id;

    IF current_work_order IS NULL THEN
        RAISE EXCEPTION 'Work order not found or does not belong to the specified company.';
    END IF;

    -- Check if the work order is already completed and finish_time should not be overwritten
    IF current_work_order.status = 'Completed' AND current_work_order.finish_time IS NOT NULL AND NOT _force_overwrite_finish_time THEN
        RAISE EXCEPTION 'Work order is already completed and finish time cannot be overwritten.';
    END IF;

    -- Update the work order
    UPDATE public.work_orders
    SET
        status = 'Completed',
        finish_time = COALESCE(current_work_order.finish_time, now()), -- Only set if not already set, or if forced
        comments = COALESCE(_comments, comments), -- Merge/overwrite comments
        parts_used = COALESCE(_parts_used, parts_used), -- Merge/overwrite parts_used
        photo_urls = COALESCE(_photo_urls, photo_urls), -- Merge/overwrite photo_urls
        signature_data_url = COALESCE(_signature_data_url, signature_data_url) -- Merge/overwrite signature_data_url
    WHERE
        id = _work_order_id AND company_id = _company_id
    RETURNING * INTO current_work_order;

    RETURN NEXT current_work_order;
END;
$$;

-- Grant usage to authenticated users (or specific roles if needed)
GRANT EXECUTE ON FUNCTION public.complete_work_order(uuid, uuid, text, jsonb, text[], text, boolean) TO authenticated;

-- Add RLS policy for work_orders table to allow technicians to update their assigned work orders
-- This policy should be carefully reviewed and adjusted based on your exact RLS strategy.
-- Assuming a policy already exists for technicians to read/update their assigned work orders.
-- If not, a policy like this might be needed:
-- CREATE POLICY "Technicians can update their assigned work orders"
-- ON public.work_orders FOR UPDATE
-- TO authenticated
-- USING (
--     (id = _work_order_id) AND
--     (technician_id = auth.uid()) AND
--     (company_id = _company_id)
-- );

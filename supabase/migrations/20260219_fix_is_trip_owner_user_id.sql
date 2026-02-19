-- Fix is_trip_owner to use user_id column
-- The trips table was migrated to use user_id (not owner_id) as the owner field,
-- but this function was never updated, causing trip_locations RLS to silently block
-- all insert/update/delete operations by trip owners.
CREATE OR REPLACE FUNCTION public.is_trip_owner(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips
    WHERE id = _trip_id
      AND user_id = _user_id
  )
$$;

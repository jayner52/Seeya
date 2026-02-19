-- Fix is_trip_owner function body
-- The function signature is (trip_uuid, user_uuid) but every RLS policy calls it as
-- is_trip_owner(auth.uid(), trip_id) — user first, trip second. The body was checking
-- id = trip_uuid AND user_id = user_uuid, which evaluated to id = auth.uid() AND
-- user_id = trip_id — always false. Fix by swapping the body to match call order.
CREATE OR REPLACE FUNCTION public.is_trip_owner(trip_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
      SELECT 1 FROM trips
      WHERE id = user_uuid AND user_id = trip_uuid
    );
$function$

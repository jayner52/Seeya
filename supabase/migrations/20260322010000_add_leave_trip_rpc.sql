-- Allow non-owner participants to leave a trip
CREATE OR REPLACE FUNCTION public.leave_trip(p_trip_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trip owner cannot leave their own trip
  IF EXISTS (SELECT 1 FROM trips WHERE id = p_trip_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Trip owner cannot leave their own trip';
  END IF;

  DELETE FROM trip_participants
  WHERE trip_id = p_trip_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a participant of this trip';
  END IF;
END;
$$;

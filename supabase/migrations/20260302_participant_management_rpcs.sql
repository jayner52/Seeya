-- RPCs for owner to manage trip participants, running SECURITY DEFINER to bypass RLS.
-- Auth checks are done inside the functions.

-- Remove a participant from a trip (owner only, cannot remove self)
CREATE OR REPLACE FUNCTION public.remove_trip_participant(
  p_trip_id UUID,
  p_participant_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_owner UUID;
  v_participant_user UUID;
BEGIN
  -- Check caller is the trip owner
  SELECT user_id INTO v_trip_owner FROM public.trips WHERE id = p_trip_id;
  IF v_trip_owner IS NULL OR v_trip_owner != auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Prevent removing the owner
  SELECT user_id INTO v_participant_user
  FROM public.trip_participants WHERE id = p_participant_id AND trip_id = p_trip_id;
  IF v_participant_user = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove the trip owner';
  END IF;

  DELETE FROM public.trip_participants WHERE id = p_participant_id AND trip_id = p_trip_id;
END;
$$;

-- Update a participant's status (owner only)
CREATE OR REPLACE FUNCTION public.update_trip_participant_status(
  p_trip_id UUID,
  p_participant_id UUID,
  p_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_owner UUID;
BEGIN
  IF p_status NOT IN ('confirmed', 'maybe', 'invited') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT user_id INTO v_trip_owner FROM public.trips WHERE id = p_trip_id;
  IF v_trip_owner IS NULL OR v_trip_owner != auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.trip_participants
  SET status = p_status
  WHERE id = p_participant_id AND trip_id = p_trip_id;
END;
$$;

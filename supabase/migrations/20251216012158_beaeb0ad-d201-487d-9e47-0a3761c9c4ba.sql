-- Create a function to get trip invite preview that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_trip_invite_preview(_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite RECORD;
  _trip RECORD;
  _owner RECORD;
  _locations JSON;
  _resources JSON;
BEGIN
  -- Find and validate invite
  SELECT id, trip_id, expires_at, max_uses, use_count INTO _invite 
  FROM public.trip_invites
  WHERE token = _token
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses);

  IF _invite IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get trip details
  SELECT id, name, destination, start_date, end_date, is_flexible_dates, flexible_month, owner_id 
  INTO _trip 
  FROM public.trips 
  WHERE id = _invite.trip_id;

  IF _trip IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get owner profile
  SELECT full_name, username, avatar_url INTO _owner 
  FROM public.profiles 
  WHERE id = _trip.owner_id;

  -- Get locations
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', tl.id,
      'destination', tl.destination,
      'start_date', tl.start_date,
      'end_date', tl.end_date
    ) ORDER BY tl.order_index
  ), '[]'::json) INTO _locations
  FROM public.trip_locations tl
  WHERE tl.trip_id = _invite.trip_id;

  -- Get resources
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', tr.id,
      'title', tr.title,
      'category', tr.category,
      'location_id', tr.location_id,
      'start_date', tr.start_date
    ) ORDER BY tr.start_date NULLS LAST
  ), '[]'::json) INTO _resources
  FROM public.trip_resources tr
  WHERE tr.trip_id = _invite.trip_id;

  RETURN json_build_object(
    'trip', json_build_object(
      'id', _trip.id,
      'name', _trip.name,
      'destination', _trip.destination,
      'start_date', _trip.start_date,
      'end_date', _trip.end_date,
      'is_flexible_dates', _trip.is_flexible_dates,
      'flexible_month', _trip.flexible_month,
      'owner_id', _trip.owner_id
    ),
    'owner', json_build_object(
      'full_name', _owner.full_name,
      'username', _owner.username,
      'avatar_url', _owner.avatar_url
    ),
    'locations', _locations,
    'resources', _resources
  );
END;
$$;
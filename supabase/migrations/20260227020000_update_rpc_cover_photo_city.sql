-- Update create_trip_with_locations to accept an optional cover_photo_city parameter.
CREATE OR REPLACE FUNCTION public.create_trip_with_locations(
  p_name text,
  p_description text,
  p_start_date date,
  p_end_date date,
  p_visibility text,
  p_locations jsonb,
  p_invited_friends uuid[],
  p_cover_photo_city text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create a trip';
  END IF;

  -- 1. Create the trip
  INSERT INTO public.trips (user_id, name, description, start_date, end_date, visibility, cover_photo_city)
  VALUES (v_user_id, p_name, p_description, p_start_date, p_end_date, p_visibility::visibility_level, p_cover_photo_city)
  RETURNING id INTO v_trip_id;

  -- 2. Add owner as confirmed participant
  INSERT INTO public.trip_participants (trip_id, user_id, status)
  VALUES (v_trip_id, v_user_id, 'confirmed')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- 3. Add locations
  IF p_locations IS NOT NULL AND jsonb_array_length(p_locations) > 0 THEN
    INSERT INTO public.trip_locations (trip_id, custom_location, order_index)
    SELECT
      v_trip_id,
      loc->>'custom_location',
      (loc->>'order_index')::integer
    FROM jsonb_array_elements(p_locations) AS loc;
  END IF;

  -- 4. Invite friends
  IF p_invited_friends IS NOT NULL AND array_length(p_invited_friends, 1) > 0 THEN
    INSERT INTO public.trip_participants (trip_id, user_id, status)
    SELECT v_trip_id, friend_id, 'invited'
    FROM unnest(p_invited_friends) AS friend_id
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;

  RETURN v_trip_id;
END;
$$;

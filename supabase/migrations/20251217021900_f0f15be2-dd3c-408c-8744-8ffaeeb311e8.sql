-- Function to get a user's public trips visible to friends
CREATE OR REPLACE FUNCTION public.get_user_public_trips(_viewer_id uuid, _profile_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  destination text,
  start_date date,
  end_date date,
  visibility visibility_level,
  is_flexible_dates boolean,
  flexible_month text,
  is_owner boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow viewing own profile or if friends
  IF _viewer_id != _profile_id AND NOT are_friends(_viewer_id, _profile_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Trips owned by profile user
  SELECT 
    t.id, 
    t.name, 
    t.destination, 
    t.start_date, 
    t.end_date,
    t.visibility,
    t.is_flexible_dates, 
    t.flexible_month,
    true as is_owner
  FROM trips t
  WHERE t.owner_id = _profile_id
    AND t.visibility != 'only_me'
  
  UNION
  
  -- Trips where profile user is a confirmed participant
  SELECT 
    t.id, 
    t.name, 
    t.destination, 
    t.start_date, 
    t.end_date,
    COALESCE(tp.personal_visibility, t.visibility) as visibility,
    t.is_flexible_dates, 
    t.flexible_month,
    false as is_owner
  FROM trips t
  JOIN trip_participants tp ON tp.trip_id = t.id
  WHERE tp.user_id = _profile_id
    AND tp.status = 'confirmed'
    AND COALESCE(tp.personal_visibility, t.visibility) != 'only_me'
    AND t.visibility != 'only_me'
  
  ORDER BY start_date DESC NULLS LAST;
END;
$$;
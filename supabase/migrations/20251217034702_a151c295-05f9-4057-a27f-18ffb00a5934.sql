-- Drop and recreate the function with fixed column name
DROP FUNCTION IF EXISTS public.get_user_countries_and_cities(_viewer_id uuid, _profile_id uuid);

CREATE OR REPLACE FUNCTION public.get_user_countries_and_cities(_viewer_id uuid, _profile_id uuid)
RETURNS TABLE (
  type text,
  item_id uuid,
  name text,
  emoji text,
  country_name text,
  country_emoji text,
  rec_count integer,
  trip_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_self boolean;
  is_friend boolean;
  today date := CURRENT_DATE;
BEGIN
  is_self := _viewer_id = _profile_id;
  is_friend := are_friends(_viewer_id, _profile_id);
  
  -- Only allow viewing if owner or friend
  IF NOT is_self AND NOT is_friend THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH past_trips AS (
    SELECT t.id, t.city_id, t.destination
    FROM trips t
    WHERE t.owner_id = _profile_id AND (t.end_date < today OR t.is_logged_past_trip = true)
    UNION
    SELECT t.id, t.city_id, t.destination
    FROM trip_participants tp
    JOIN trips t ON t.id = tp.trip_id
    WHERE tp.user_id = _profile_id AND tp.status = 'confirmed' AND (t.end_date < today OR t.is_logged_past_trip = true)
  ),
  trip_locations_data AS (
    SELECT tl.city_id, tl.destination, tl.trip_id
    FROM trip_locations tl
    WHERE tl.trip_id IN (SELECT pt.id FROM past_trips pt)
  ),
  all_countries AS (
    SELECT c.id, c.name, c.emoji FROM countries c
  ),
  -- Country stats from recommendations
  rec_country_stats AS (
    SELECT COALESCE(sr.country_id, ci.country_id) as country_id, COUNT(*)::integer as cnt
    FROM shared_recommendations sr
    LEFT JOIN cities ci ON ci.id = sr.city_id
    WHERE sr.user_id = _profile_id AND COALESCE(sr.country_id, ci.country_id) IS NOT NULL
    GROUP BY COALESCE(sr.country_id, ci.country_id)
  ),
  -- Country stats from trips (via city)
  trip_country_stats AS (
    SELECT ci.country_id, COUNT(DISTINCT pt.id)::integer as cnt
    FROM past_trips pt
    JOIN cities ci ON ci.id = pt.city_id
    GROUP BY ci.country_id
  ),
  -- Country stats from trip locations (via city)
  loc_country_stats AS (
    SELECT ci.country_id, COUNT(DISTINCT tl.trip_id)::integer as cnt
    FROM trip_locations_data tl
    JOIN cities ci ON ci.id = tl.city_id
    GROUP BY ci.country_id
  ),
  -- Country stats from destination text matching
  dest_country_stats AS (
    SELECT c.id as country_id, COUNT(DISTINCT pt.id)::integer as cnt
    FROM past_trips pt
    CROSS JOIN all_countries c
    WHERE pt.city_id IS NULL AND pt.destination IS NOT NULL
      AND (LOWER(pt.destination) = LOWER(c.name) OR LOWER(pt.destination) LIKE '%, ' || LOWER(c.name))
    GROUP BY c.id
  ),
  combined_country_stats AS (
    SELECT 
      c.id,
      c.name,
      c.emoji,
      COALESCE(rcs.cnt, 0) as rec_count,
      COALESCE(tcs.cnt, 0) + COALESCE(lcs.cnt, 0) + COALESCE(dcs.cnt, 0) as trip_count
    FROM all_countries c
    LEFT JOIN rec_country_stats rcs ON rcs.country_id = c.id
    LEFT JOIN trip_country_stats tcs ON tcs.country_id = c.id
    LEFT JOIN loc_country_stats lcs ON lcs.country_id = c.id
    LEFT JOIN dest_country_stats dcs ON dcs.country_id = c.id
    WHERE rcs.cnt > 0 OR tcs.cnt > 0 OR lcs.cnt > 0 OR dcs.cnt > 0
  ),
  -- City stats
  rec_city_stats AS (
    SELECT sr.city_id, COUNT(*)::integer as cnt
    FROM shared_recommendations sr
    WHERE sr.user_id = _profile_id AND sr.city_id IS NOT NULL
    GROUP BY sr.city_id
  ),
  trip_city_stats AS (
    SELECT pt.city_id, COUNT(DISTINCT pt.id)::integer as cnt
    FROM past_trips pt
    WHERE pt.city_id IS NOT NULL
    GROUP BY pt.city_id
  ),
  loc_city_stats AS (
    SELECT tl.city_id, COUNT(DISTINCT tl.trip_id)::integer as cnt
    FROM trip_locations_data tl
    WHERE tl.city_id IS NOT NULL
    GROUP BY tl.city_id
  ),
  combined_city_stats AS (
    SELECT 
      ci.id,
      ci.name,
      c.name as country_name,
      c.emoji as country_emoji,
      COALESCE(rcs.cnt, 0) as rec_count,
      COALESCE(tcs.cnt, 0) + COALESCE(lcs.cnt, 0) as trip_count
    FROM cities ci
    JOIN countries c ON c.id = ci.country_id
    LEFT JOIN rec_city_stats rcs ON rcs.city_id = ci.id
    LEFT JOIN trip_city_stats tcs ON tcs.city_id = ci.id
    LEFT JOIN loc_city_stats lcs ON lcs.city_id = ci.id
    WHERE rcs.cnt > 0 OR tcs.cnt > 0 OR lcs.cnt > 0
  )
  -- Return countries
  SELECT 
    'country'::text as type,
    ccs.id as item_id,
    ccs.name,
    ccs.emoji,
    NULL::text as country_name,
    NULL::text as country_emoji,
    ccs.rec_count::integer,
    ccs.trip_count::integer
  FROM combined_country_stats ccs
  UNION ALL
  -- Return cities
  SELECT 
    'city'::text as type,
    ccs.id as item_id,
    ccs.name,
    NULL::text as emoji,
    ccs.country_name,
    ccs.country_emoji,
    ccs.rec_count::integer,
    ccs.trip_count::integer
  FROM combined_city_stats ccs
  ORDER BY rec_count DESC, trip_count DESC;
END;
$$;
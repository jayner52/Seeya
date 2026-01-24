-- Drop and recreate the function with trip_locations destination text matching
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
SET search_path TO 'public'
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
    SELECT t.id AS trip_id, t.city_id, t.destination
    FROM trips t
    WHERE t.owner_id = _profile_id AND (t.end_date < today OR t.is_logged_past_trip = true)
    UNION
    SELECT t.id AS trip_id, t.city_id, t.destination
    FROM trip_participants tp
    JOIN trips t ON t.id = tp.trip_id
    WHERE tp.user_id = _profile_id AND tp.status = 'confirmed' AND (t.end_date < today OR t.is_logged_past_trip = true)
  ),
  trip_locations_data AS (
    SELECT tl.city_id, tl.destination, tl.trip_id
    FROM trip_locations tl
    WHERE tl.trip_id IN (SELECT pt.trip_id FROM past_trips pt)
  ),
  all_countries AS (
    SELECT c.id AS country_id, c.name AS country_name, c.emoji AS country_emoji FROM countries c
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
    SELECT ci.country_id, COUNT(DISTINCT pt.trip_id)::integer as cnt
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
  -- Country stats from trip destination text matching
  dest_country_stats AS (
    SELECT ac.country_id, COUNT(DISTINCT pt.trip_id)::integer as cnt
    FROM past_trips pt
    CROSS JOIN all_countries ac
    WHERE pt.city_id IS NULL AND pt.destination IS NOT NULL
      AND (LOWER(pt.destination) = LOWER(ac.country_name) OR LOWER(pt.destination) LIKE '%, ' || LOWER(ac.country_name))
    GROUP BY ac.country_id
  ),
  -- Country stats from trip_locations destination text matching (NEW!)
  loc_dest_country_stats AS (
    SELECT ac.country_id, COUNT(DISTINCT tl.trip_id)::integer as cnt
    FROM trip_locations_data tl
    CROSS JOIN all_countries ac
    WHERE tl.city_id IS NULL AND tl.destination IS NOT NULL
      AND (LOWER(tl.destination) = LOWER(ac.country_name) OR LOWER(tl.destination) LIKE '%, ' || LOWER(ac.country_name))
    GROUP BY ac.country_id
  ),
  combined_country_stats AS (
    SELECT 
      ac.country_id,
      ac.country_name,
      ac.country_emoji,
      COALESCE(rcs.cnt, 0) as rec_count,
      COALESCE(tcs.cnt, 0) + COALESCE(lcs.cnt, 0) + COALESCE(dcs.cnt, 0) + COALESCE(ldcs.cnt, 0) as trip_count
    FROM all_countries ac
    LEFT JOIN rec_country_stats rcs ON rcs.country_id = ac.country_id
    LEFT JOIN trip_country_stats tcs ON tcs.country_id = ac.country_id
    LEFT JOIN loc_country_stats lcs ON lcs.country_id = ac.country_id
    LEFT JOIN dest_country_stats dcs ON dcs.country_id = ac.country_id
    LEFT JOIN loc_dest_country_stats ldcs ON ldcs.country_id = ac.country_id
    WHERE rcs.cnt > 0 OR tcs.cnt > 0 OR lcs.cnt > 0 OR dcs.cnt > 0 OR ldcs.cnt > 0
  ),
  -- City stats
  rec_city_stats AS (
    SELECT sr.city_id, COUNT(*)::integer as cnt
    FROM shared_recommendations sr
    WHERE sr.user_id = _profile_id AND sr.city_id IS NOT NULL
    GROUP BY sr.city_id
  ),
  trip_city_stats AS (
    SELECT pt.city_id, COUNT(DISTINCT pt.trip_id)::integer as cnt
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
      ci.id AS city_id,
      ci.name AS city_name,
      c.name AS city_country_name,
      c.emoji AS city_country_emoji,
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
    ccs.country_id as item_id,
    ccs.country_name as name,
    ccs.country_emoji as emoji,
    NULL::text as country_name,
    NULL::text as country_emoji,
    ccs.rec_count::integer,
    ccs.trip_count::integer
  FROM combined_country_stats ccs
  UNION ALL
  -- Return cities
  SELECT 
    'city'::text as type,
    ccs.city_id as item_id,
    ccs.city_name as name,
    NULL::text as emoji,
    ccs.city_country_name as country_name,
    ccs.city_country_emoji as country_emoji,
    ccs.rec_count::integer,
    ccs.trip_count::integer
  FROM combined_city_stats ccs
  ORDER BY rec_count DESC, trip_count DESC;
END;
$$;

-- Drop the old function
DROP FUNCTION IF EXISTS public.get_destination_stats(uuid);

-- Create new function that extracts individual cities/countries from trip_locations
CREATE OR REPLACE FUNCTION public.get_popular_locations(_user_id uuid)
RETURNS TABLE(
  location_name text,
  country_emoji text,
  country_name text,
  trip_count bigint,
  is_country boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH circle_users AS (
    -- Get friends
    SELECT DISTINCT 
      CASE 
        WHEN f.requester_id = _user_id THEN f.addressee_id
        ELSE f.requester_id
      END as user_id
    FROM friendships f
    WHERE f.status = 'accepted'
      AND (_user_id IN (f.requester_id, f.addressee_id))
    UNION
    -- Get tripmates
    SELECT DISTINCT tp2.user_id
    FROM trip_participants tp1
    JOIN trip_participants tp2 ON tp1.trip_id = tp2.trip_id
    WHERE tp1.user_id = _user_id
      AND tp2.user_id != _user_id
      AND tp1.status = 'confirmed'
      AND tp2.status = 'confirmed'
  ),
  circle_trips AS (
    -- Get trips from circle users that are visible
    SELECT t.id as trip_id
    FROM trips t
    JOIN circle_users cu ON cu.user_id = t.owner_id
    WHERE t.visibility != 'only_me'
  ),
  all_locations AS (
    -- Extract all locations from trip_locations for circle trips
    SELECT 
      tl.destination,
      tl.city_id,
      ct.trip_id
    FROM trip_locations tl
    JOIN circle_trips ct ON ct.trip_id = tl.trip_id
  ),
  locations_with_country AS (
    SELECT 
      al.destination,
      al.trip_id,
      -- Try to get country emoji from various sources
      COALESCE(
        -- 1. From linked city's country
        c_city.emoji,
        -- 2. Direct country match (destination IS a country name)
        c_direct.emoji,
        -- 3. Suffix match for "City, Country" format
        c_suffix.emoji,
        '🌍'
      ) as country_emoji,
      COALESCE(
        c_city.name,
        c_direct.name,
        c_suffix.name
      ) as country_name,
      -- Determine if this is a country (direct match exists)
      (c_direct.id IS NOT NULL) as is_country
    FROM all_locations al
    LEFT JOIN cities ci ON ci.id = al.city_id
    LEFT JOIN countries c_city ON c_city.id = ci.country_id
    LEFT JOIN countries c_direct ON LOWER(c_direct.name) = LOWER(al.destination)
    LEFT JOIN countries c_suffix ON al.destination ILIKE '%, ' || c_suffix.name
  )
  SELECT 
    lwc.destination as location_name,
    lwc.country_emoji,
    lwc.country_name,
    COUNT(DISTINCT lwc.trip_id)::bigint as trip_count,
    BOOL_OR(lwc.is_country) as is_country
  FROM locations_with_country lwc
  GROUP BY lwc.destination, lwc.country_emoji, lwc.country_name
  ORDER BY COUNT(DISTINCT lwc.trip_id) DESC, lwc.destination
  LIMIT 12;
END;
$function$;

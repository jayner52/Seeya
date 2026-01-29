-- Create function to get friends' upcoming trips respecting visibility
CREATE OR REPLACE FUNCTION public.get_circle_trips(_user_id uuid)
RETURNS TABLE (
  trip_id uuid,
  trip_name text,
  destination text,
  start_date date,
  end_date date,
  visibility visibility_level,
  owner_id uuid,
  owner_username text,
  owner_full_name text,
  owner_avatar_url text,
  country_emoji text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as trip_id,
    t.name as trip_name,
    t.destination,
    t.start_date,
    t.end_date,
    t.visibility,
    t.owner_id,
    p.username as owner_username,
    p.full_name as owner_full_name,
    p.avatar_url as owner_avatar_url,
    c.emoji as country_emoji
  FROM trips t
  JOIN profiles p ON p.id = t.owner_id
  LEFT JOIN cities ci ON ci.id = t.city_id
  LEFT JOIN countries c ON c.id = ci.country_id
  WHERE t.owner_id != _user_id
    AND t.visibility != 'only_me'
    AND t.end_date >= CURRENT_DATE
    AND (
      EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = _user_id AND f.addressee_id = t.owner_id)
            OR (f.addressee_id = _user_id AND f.requester_id = t.owner_id))
      )
      OR
      EXISTS (
        SELECT 1 FROM trip_participants tp1
        JOIN trip_participants tp2 ON tp1.trip_id = tp2.trip_id
        WHERE tp1.user_id = _user_id
          AND tp2.user_id = t.owner_id
          AND tp1.status = 'confirmed'
          AND tp2.status = 'confirmed'
      )
    )
  ORDER BY t.start_date ASC
  LIMIT 50;
END;
$$;

-- Create function to get destination statistics from circle
CREATE OR REPLACE FUNCTION public.get_destination_stats(_user_id uuid)
RETURNS TABLE (
  destination text,
  country_emoji text,
  country_name text,
  trip_count bigint,
  recommendation_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH circle_users AS (
    SELECT DISTINCT 
      CASE 
        WHEN f.requester_id = _user_id THEN f.addressee_id
        ELSE f.requester_id
      END as user_id
    FROM friendships f
    WHERE f.status = 'accepted'
      AND (_user_id IN (f.requester_id, f.addressee_id))
    UNION
    SELECT DISTINCT tp2.user_id
    FROM trip_participants tp1
    JOIN trip_participants tp2 ON tp1.trip_id = tp2.trip_id
    WHERE tp1.user_id = _user_id
      AND tp2.user_id != _user_id
      AND tp1.status = 'confirmed'
      AND tp2.status = 'confirmed'
  ),
  trip_destinations AS (
    SELECT 
      t.destination,
      c.emoji as country_emoji,
      c.name as country_name
    FROM trips t
    JOIN circle_users cu ON cu.user_id = t.owner_id
    LEFT JOIN cities ci ON ci.id = t.city_id
    LEFT JOIN countries c ON c.id = ci.country_id
    WHERE t.visibility != 'only_me'
  ),
  rec_counts AS (
    SELECT 
      COALESCE(ci.name, c.name, 'Unknown') as location,
      COUNT(*) as rec_count
    FROM shared_recommendations sr
    JOIN circle_users cu ON cu.user_id = sr.user_id
    LEFT JOIN cities ci ON ci.id = sr.city_id
    LEFT JOIN countries c ON c.id = sr.country_id
    GROUP BY COALESCE(ci.name, c.name, 'Unknown')
  )
  SELECT 
    td.destination,
    td.country_emoji,
    td.country_name,
    COUNT(*)::bigint as trip_count,
    COALESCE(rc.rec_count, 0)::bigint as recommendation_count
  FROM trip_destinations td
  LEFT JOIN rec_counts rc ON rc.location = td.destination
  GROUP BY td.destination, td.country_emoji, td.country_name, rc.rec_count
  ORDER BY COUNT(*) DESC, COALESCE(rc.rec_count, 0) DESC
  LIMIT 10;
END;
$$;
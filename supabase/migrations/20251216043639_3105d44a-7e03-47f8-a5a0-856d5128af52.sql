-- Function to get tripmates (people who share trips but aren't friends)
CREATE OR REPLACE FUNCTION public.get_tripmates(_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  first_shared_trip_date timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH trip_partners AS (
    -- People who are participants in trips I own
    SELECT DISTINCT tp.user_id, MIN(tp.invited_at) as first_date
    FROM trip_participants tp
    JOIN trips t ON t.id = tp.trip_id
    WHERE t.owner_id = _user_id 
      AND tp.status IN ('confirmed', 'invited')
      AND tp.user_id != _user_id
    GROUP BY tp.user_id
    
    UNION
    
    -- Owners of trips I'm participating in
    SELECT DISTINCT t.owner_id, MIN(tp.invited_at) as first_date
    FROM trip_participants tp
    JOIN trips t ON t.id = tp.trip_id
    WHERE tp.user_id = _user_id
      AND tp.status IN ('confirmed', 'invited')
      AND t.owner_id != _user_id
    GROUP BY t.owner_id
    
    UNION
    
    -- Other participants in trips I'm participating in
    SELECT DISTINCT tp2.user_id, MIN(LEAST(tp.invited_at, tp2.invited_at)) as first_date
    FROM trip_participants tp
    JOIN trip_participants tp2 ON tp.trip_id = tp2.trip_id
    WHERE tp.user_id = _user_id
      AND tp2.user_id != _user_id
      AND tp.status IN ('confirmed', 'invited')
      AND tp2.status IN ('confirmed', 'invited')
    GROUP BY tp2.user_id
  )
  SELECT tp.user_id, MIN(tp.first_date) as first_shared_trip_date
  FROM trip_partners tp
  WHERE NOT are_friends(_user_id, tp.user_id)
  GROUP BY tp.user_id;
$$;

-- Update RLS policy on shared_recommendations to include tripmates
DROP POLICY IF EXISTS "Users can view friend recommendations" ON shared_recommendations;

CREATE POLICY "Users can view friend and tripmate recommendations" 
ON shared_recommendations
FOR SELECT
USING (
  are_friends(auth.uid(), user_id) 
  OR shares_trip_with(auth.uid(), user_id)
);
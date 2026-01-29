-- Create wanderlist table for dream destinations
CREATE TABLE public.wanderlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  city_id UUID REFERENCES public.cities(id),
  country_id UUID REFERENCES public.countries(id),
  name TEXT NOT NULL,
  google_place_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, google_place_id)
);

-- Enable RLS
ALTER TABLE public.wanderlist ENABLE ROW LEVEL SECURITY;

-- Users can manage their own wanderlist
CREATE POLICY "Users can manage own wanderlist" ON public.wanderlist
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Friends and tripmates can view wanderlist
CREATE POLICY "Friends can view wanderlist" ON public.wanderlist
  FOR SELECT USING (
    are_friends(auth.uid(), user_id) OR 
    shares_trip_with(auth.uid(), user_id)
  );

-- Create function to get trending wanderlist destinations in user's circle
CREATE OR REPLACE FUNCTION public.get_trending_wanderlist(_user_id uuid)
RETURNS TABLE(
  name text,
  google_place_id text,
  city_id uuid,
  country_id uuid,
  friend_count bigint,
  country_emoji text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  )
  SELECT 
    w.name,
    w.google_place_id,
    w.city_id,
    w.country_id,
    COUNT(DISTINCT w.user_id) as friend_count,
    c.emoji as country_emoji
  FROM wanderlist w
  JOIN circle_users cu ON cu.user_id = w.user_id
  LEFT JOIN cities ci ON ci.id = w.city_id
  LEFT JOIN countries c ON c.id = COALESCE(w.country_id, ci.country_id)
  GROUP BY w.name, w.google_place_id, w.city_id, w.country_id, c.emoji
  ORDER BY friend_count DESC, w.name
  LIMIT 10;
END;
$$;
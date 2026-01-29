-- Fix profiles RLS: restrict to legitimate relationships only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create helper function to check if users share a trip
CREATE OR REPLACE FUNCTION public.shares_trip_with(_user_id_1 uuid, _user_id_2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Both are participants in the same trip
    SELECT 1 FROM public.trip_participants tp1
    JOIN public.trip_participants tp2 ON tp1.trip_id = tp2.trip_id
    WHERE tp1.user_id = _user_id_1 AND tp2.user_id = _user_id_2
  )
  OR EXISTS (
    -- One is owner, other is participant
    SELECT 1 FROM public.trips t
    JOIN public.trip_participants tp ON t.id = tp.trip_id
    WHERE (t.owner_id = _user_id_1 AND tp.user_id = _user_id_2)
       OR (t.owner_id = _user_id_2 AND tp.user_id = _user_id_1)
  )
  OR EXISTS (
    -- Both are owners of trips they share (via cross-participation)
    SELECT 1 FROM public.trips t1
    JOIN public.trips t2 ON t1.owner_id = _user_id_1 AND t2.owner_id = _user_id_2
    WHERE t1.id = t2.id
  )
$$;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can view friends' profiles
CREATE POLICY "Users can view friends profiles"
ON public.profiles FOR SELECT
USING (public.are_friends(auth.uid(), id));

-- Policy: Users can view trip co-participants' profiles
CREATE POLICY "Users can view trip participants profiles"
ON public.profiles FOR SELECT
USING (public.shares_trip_with(auth.uid(), id));

-- Create secure search function for finding users to add as friends
CREATE OR REPLACE FUNCTION public.search_users_for_friends(_query TEXT)
RETURNS TABLE (id UUID, username TEXT, full_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _query IS NULL OR LENGTH(_query) < 3 THEN
    RAISE EXCEPTION 'Search query must be at least 3 characters';
  END IF;
  
  RETURN QUERY
  SELECT p.id, p.username, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE (p.username ILIKE _query || '%' OR p.full_name ILIKE '%' || _query || '%')
    AND p.id != auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.requester_id = auth.uid() AND f.addressee_id = p.id)
         OR (f.addressee_id = auth.uid() AND f.requester_id = p.id)
    )
  LIMIT 20;
END;
$$;
-- Fix the infinite recursion in trips RLS policies
-- The issue is that "Users can view trips they're invited to" does a subquery on trip_participants
-- which has a policy that references trips, causing recursion

-- Create a security definer function to check trip participation without triggering RLS
CREATE OR REPLACE FUNCTION public.is_trip_participant(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_participants
    WHERE user_id = _user_id
      AND trip_id = _trip_id
      AND status IN ('invited', 'confirmed')
  )
$$;

-- Create function to check if user is trip owner
CREATE OR REPLACE FUNCTION public.is_trip_owner(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips
    WHERE id = _trip_id
      AND owner_id = _user_id
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view trips they're invited to" ON trips;

-- Recreate with security definer function
CREATE POLICY "Users can view trips they're invited to" ON trips
  FOR SELECT USING (
    public.is_trip_participant(auth.uid(), id)
  );

-- Also fix trip_participants policies that reference trips
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Participants can add recommendations" ON trip_recommendations;
DROP POLICY IF EXISTS "Participants can view recommendations" ON trip_recommendations;

-- Recreate trip_participants policy using the function
CREATE POLICY "Trip owners can manage participants" ON trip_participants
  FOR ALL USING (
    public.is_trip_owner(auth.uid(), trip_id)
  );

-- Recreate trip_recommendations policies using functions
CREATE POLICY "Participants can add recommendations" ON trip_recommendations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      public.is_trip_participant(auth.uid(), trip_id) OR
      public.is_trip_owner(auth.uid(), trip_id)
    )
  );

CREATE POLICY "Participants can view recommendations" ON trip_recommendations
  FOR SELECT USING (
    public.is_trip_participant(auth.uid(), trip_id) OR
    public.is_trip_owner(auth.uid(), trip_id)
  );
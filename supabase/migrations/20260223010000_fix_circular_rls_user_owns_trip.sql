-- Fix circular RLS dependency that blocked trip_participants and trip_locations inserts
-- for brand-new trips.
--
-- Root cause: The inline EXISTS check in trip_participants/trip_locations policies
-- ran under the caller's permissions. When it queried the `trips` table, trips'
-- own SELECT RLS fired. That policy requires the user to already be a participant
-- (is_trip_participant), which returns FALSE for a brand-new trip with zero
-- participants → chicken-and-egg deadlock.
--
-- Fix: SECURITY DEFINER function `user_owns_trip` bypasses trips' SELECT RLS,
-- breaking the circular dependency.

CREATE OR REPLACE FUNCTION public.user_owns_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id AND user_id = auth.uid()
  );
$$;

-- Replace trip_participants INSERT policy
DROP POLICY IF EXISTS "Trip owners can manage participants" ON public.trip_participants;
CREATE POLICY "Trip owners can manage participants" ON public.trip_participants
  FOR ALL USING (public.user_owns_trip(trip_id));

-- Replace trip_locations INSERT policy
DROP POLICY IF EXISTS "Trip owners can manage locations" ON public.trip_locations;
CREATE POLICY "Trip owners can manage locations" ON public.trip_locations
  FOR ALL USING (public.user_owns_trip(trip_id));

-- Also fix is_trip_owner for any other policies that still reference it
CREATE OR REPLACE FUNCTION public.is_trip_owner(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = trip_uuid AND user_id = user_uuid
  );
$$;

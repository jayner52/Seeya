-- Fix RLS policies for trip_participants and trip_locations
-- Applied manually to live DB on 2026-02-23 via Supabase SQL Editor.
--
-- Background:
-- The is_trip_owner(trip_uuid uuid, user_uuid uuid) function has confusingly swapped
-- parameter names (first param receives auth.uid() but is named trip_uuid; second
-- receives the trip_id but is named user_uuid). Despite multiple fix attempts, the
-- function was still silently returning false under the RLS context, causing all
-- participant and location INSERTs to return 0 rows without throwing (PostgREST
-- returns HTTP 200 with empty body on RLS block, not an error).
--
-- Fix: Replace both policies with direct EXISTS checks that do not use is_trip_owner.

DROP POLICY IF EXISTS "Trip owners can manage participants" ON public.trip_participants;
CREATE POLICY "Trip owners can manage participants" ON public.trip_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = trip_participants.trip_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trip owners can manage locations" ON public.trip_locations;
CREATE POLICY "Trip owners can manage locations" ON public.trip_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = trip_locations.trip_id AND user_id = auth.uid()
    )
  );

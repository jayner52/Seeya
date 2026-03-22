-- Add 'maybe' participation status and update RLS policies to grant
-- maybe/invited users read access to trip data (bits, locations, etc.)

-- 1. Add 'maybe' to the participation_status enum
ALTER TYPE public.participation_status ADD VALUE IF NOT EXISTS 'maybe';

-- 2. Update trips SELECT: allow 'maybe' alongside 'invited'/'confirmed'
DROP POLICY IF EXISTS "Users can view trips they're invited to" ON public.trips;
CREATE POLICY "Users can view trips they're invited to"
ON public.trips FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = trips.id
    AND user_id = auth.uid()
    AND status IN ('invited', 'confirmed', 'maybe')
  )
);

-- 3. Update trip_bits SELECT: allow 'maybe' and 'invited' to preview planned bits
DROP POLICY IF EXISTS "Users can view trip_bits for their trips" ON public.trip_bits;
CREATE POLICY "Users can view trip_bits for their trips"
ON public.trip_bits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trips WHERE trips.id = trip_bits.trip_id
    AND trips.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_participants.trip_id = trip_bits.trip_id
    AND trip_participants.user_id = auth.uid()
    AND trip_participants.status IN ('confirmed', 'maybe', 'invited')
  )
);

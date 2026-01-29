-- Create location_participants table for tracking which travelers are on each leg
CREATE TABLE public.location_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.trip_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, user_id)
);

-- Enable RLS
ALTER TABLE public.location_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Trip owners can manage location participants
CREATE POLICY "Trip owners can manage location participants"
ON public.location_participants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.trip_locations tl
    JOIN public.trips t ON t.id = tl.trip_id
    WHERE tl.id = location_participants.location_id
    AND t.owner_id = auth.uid()
  )
);

-- Policy: Trip participants can view location participants
CREATE POLICY "Trip participants can view location participants"
ON public.location_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trip_locations tl
    WHERE tl.id = location_participants.location_id
    AND (is_trip_owner(auth.uid(), tl.trip_id) OR is_trip_participant(auth.uid(), tl.trip_id))
  )
);

-- Policy: Trip participants can manage their own assignment
CREATE POLICY "Trip participants can manage own assignment"
ON public.location_participants
FOR ALL
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.trip_locations tl
    WHERE tl.id = location_participants.location_id
    AND (is_trip_owner(auth.uid(), tl.trip_id) OR is_trip_participant(auth.uid(), tl.trip_id))
  )
);

-- Enable realtime for trip_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_participants;
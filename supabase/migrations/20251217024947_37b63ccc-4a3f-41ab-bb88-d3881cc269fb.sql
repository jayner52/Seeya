-- Drop the restrictive policy that only allows viewing own participation
DROP POLICY IF EXISTS "Participants can view their participation" ON trip_participants;

-- Create a new policy that allows viewing all participants on shared trips
CREATE POLICY "Users can view participants on their trips"
ON trip_participants
FOR SELECT
USING (
  -- User is the owner of the trip
  is_trip_owner(auth.uid(), trip_id)
  OR
  -- User is a participant in the same trip (confirmed or invited)
  EXISTS (
    SELECT 1 FROM trip_participants tp
    WHERE tp.trip_id = trip_participants.trip_id
    AND tp.user_id = auth.uid()
    AND tp.status IN ('confirmed', 'invited')
  )
);
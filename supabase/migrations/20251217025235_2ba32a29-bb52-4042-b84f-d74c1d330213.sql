-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view participants on their trips" ON trip_participants;

-- Create corrected policy using security definer functions (which bypass RLS)
CREATE POLICY "Users can view participants on their trips"
ON trip_participants
FOR SELECT
USING (
  is_trip_owner(auth.uid(), trip_id)
  OR
  is_trip_participant(auth.uid(), trip_id)
);
-- Safe policies for invite acceptance — no reference to trips or trip_invite_links,
-- so no circular recursion risk.

-- Allow authenticated users to insert themselves as a participant (for invite acceptance)
DROP POLICY IF EXISTS "Users can join trips via invite" ON public.trip_participants;
CREATE POLICY "Users can join trips via invite"
  ON public.trip_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own participant record (pending → confirmed)
DROP POLICY IF EXISTS "Users can update own participant record" ON public.trip_participants;
CREATE POLICY "Users can update own participant record"
  ON public.trip_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

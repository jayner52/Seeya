-- Allow authenticated users to read invite links (needed to validate code before accepting)
-- trip_invite_links may have been created outside of tracked migrations (in Supabase dashboard)
-- so we use IF NOT EXISTS guards.

-- Enable RLS on trip_invite_links if not already enabled
ALTER TABLE IF EXISTS public.trip_invite_links ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read invite links
-- (they need the code to reach this point; exposing link metadata is fine)
DROP POLICY IF EXISTS "Authenticated users can read invite links" ON public.trip_invite_links;
CREATE POLICY "Authenticated users can read invite links"
  ON public.trip_invite_links FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow trip owners to manage their invite links
DROP POLICY IF EXISTS "Trip owners can manage invite links" ON public.trip_invite_links;
CREATE POLICY "Trip owners can manage invite links"
  ON public.trip_invite_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = trip_invite_links.trip_id AND user_id = auth.uid()
    )
  );

-- Allow any authenticated user to insert themselves as a trip participant
-- (the API validates the invite code before this INSERT runs)
DROP POLICY IF EXISTS "Users can join trips via invite" ON public.trip_participants;
CREATE POLICY "Users can join trips via invite"
  ON public.trip_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own participant record (e.g. status pending → confirmed)
DROP POLICY IF EXISTS "Users can update own participant record" ON public.trip_participants;
CREATE POLICY "Users can update own participant record"
  ON public.trip_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow participants to read their own records (needed for "already a member" check)
DROP POLICY IF EXISTS "Users can read own participant record" ON public.trip_participants;
CREATE POLICY "Users can read own participant record"
  ON public.trip_participants FOR SELECT
  USING (user_id = auth.uid());

-- Fix Security Advisor errors: RLS disabled on trip_invite_links
-- The table was created via the Supabase dashboard, so prior migrations
-- using IF EXISTS may have been applied before the table existed.

-- 1. Enable RLS (unconditionally — safe to re-run)
ALTER TABLE public.trip_invite_links ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS for table owner too (required for Supabase Security Advisor)
ALTER TABLE public.trip_invite_links FORCE ROW LEVEL SECURITY;

-- 3. Re-create policies (idempotent with DROP IF EXISTS)

-- Authenticated users can read invite links (needed to validate code)
DROP POLICY IF EXISTS "Authenticated users can read invite links" ON public.trip_invite_links;
CREATE POLICY "Authenticated users can read invite links"
  ON public.trip_invite_links FOR SELECT
  USING (auth.role() = 'authenticated');

-- Trip owners can manage (create/update/delete) their invite links
DROP POLICY IF EXISTS "Trip owners can manage invite links" ON public.trip_invite_links;
CREATE POLICY "Trip owners can manage invite links"
  ON public.trip_invite_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = trip_invite_links.trip_id AND user_id = auth.uid()
    )
  );

-- Authenticated users can increment usage_count when accepting an invite
DROP POLICY IF EXISTS "Authenticated users can update invite usage" ON public.trip_invite_links;
CREATE POLICY "Authenticated users can update invite usage"
  ON public.trip_invite_links FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

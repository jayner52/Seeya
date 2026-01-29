-- Allow authenticated users to insert new cities (for auto-creating from Google Places)
CREATE POLICY "Authenticated users can insert cities"
ON public.cities FOR INSERT
TO authenticated
WITH CHECK (true);
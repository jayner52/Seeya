-- Fix: 20260301 re-introduced circular RLS by switching trips SELECT policy to a direct
-- EXISTS on trip_participants. Restore the SECURITY DEFINER wrapper while keeping 'maybe'.
-- Also: the old is_trip_participant(trip_uuid, user_uuid) had confusingly swapped params
-- (body worked for trip_participants callers but was backwards for trips callers).
-- Must DROP and recreate with correct naming: (_user_id, _trip_id).

-- 1. Drop dependent policies first, then the function (CASCADE not needed)
DROP POLICY IF EXISTS "Users can view trip participants" ON public.trip_participants;
DROP FUNCTION IF EXISTS public.is_trip_participant(uuid, uuid);

-- 2. Recreate with correct parameter order and include 'maybe'
CREATE FUNCTION public.is_trip_participant(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE user_id = _user_id
      AND trip_id = _trip_id
      AND status IN ('invited', 'confirmed', 'maybe')
  );
$$;

-- 3. Restore trips SELECT policy to use SECURITY DEFINER function (breaks circular ref)
DROP POLICY IF EXISTS "Users can view trips they're invited to" ON public.trips;
CREATE POLICY "Users can view trips they're invited to" ON public.trips
  FOR SELECT USING (
    public.is_trip_participant(auth.uid(), id)
  );

-- 4. Recreate trip_participants SELECT policy with corrected argument order
CREATE POLICY "Users can view trip participants" ON public.trip_participants
  FOR SELECT USING (
    public.is_trip_participant(auth.uid(), trip_id)
    OR public.caller_is_trip_owner(trip_id)
  );

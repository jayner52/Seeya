-- Create trip_locations table for multi-location support
CREATE TABLE public.trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  city_id UUID REFERENCES public.cities(id),
  destination TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for trip_locations
CREATE POLICY "Trip owners can manage locations"
ON public.trip_locations
FOR ALL
USING (is_trip_owner(auth.uid(), trip_id));

CREATE POLICY "Participants can view locations"
ON public.trip_locations
FOR SELECT
USING (is_trip_participant(auth.uid(), trip_id));

-- Create trip_invites table for shareable invite links
CREATE TABLE public.trip_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for trip_invites
CREATE POLICY "Trip owners can manage invites"
ON public.trip_invites
FOR ALL
USING (is_trip_owner(auth.uid(), trip_id));

CREATE POLICY "Anyone can view valid invite tokens"
ON public.trip_invites
FOR SELECT
USING (
  (expires_at IS NULL OR expires_at > now())
  AND (max_uses IS NULL OR use_count < max_uses)
);

-- Function to accept an invite
CREATE OR REPLACE FUNCTION public.accept_trip_invite(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_id UUID;
  _trip_id UUID;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Find valid invite
  SELECT id, trip_id INTO _invite_id, _trip_id
  FROM public.trip_invites
  WHERE token = _token
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses);

  IF _invite_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- Check if already a participant or owner
  IF EXISTS (
    SELECT 1 FROM public.trips WHERE id = _trip_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.trip_participants WHERE trip_id = _trip_id AND user_id = _user_id
  ) THEN
    RETURN _trip_id;
  END IF;

  -- Add as participant
  INSERT INTO public.trip_participants (trip_id, user_id, status)
  VALUES (_trip_id, _user_id, 'confirmed');

  -- Increment use count
  UPDATE public.trip_invites SET use_count = use_count + 1 WHERE id = _invite_id;

  RETURN _trip_id;
END;
$$;
-- Create visibility_level enum
CREATE TYPE public.visibility_level AS ENUM ('only_me', 'busy_only', 'dates_only', 'location_only', 'full_details');

-- Create participation_status enum
CREATE TYPE public.participation_status AS ENUM ('invited', 'confirmed', 'declined');

-- Create recommendation_category enum  
CREATE TYPE public.recommendation_category AS ENUM ('restaurant', 'activity', 'stay', 'tip');

-- Create trips table
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  visibility visibility_level NOT NULL DEFAULT 'full_details',
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create trip_participants table
CREATE TABLE public.trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status participation_status NOT NULL DEFAULT 'invited',
  invited_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  UNIQUE(trip_id, user_id)
);

-- Create trip_recommendations table
CREATE TABLE public.trip_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category recommendation_category NOT NULL DEFAULT 'tip',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_recommendations ENABLE ROW LEVEL SECURITY;

-- Trips policies
CREATE POLICY "Users can view their own trips"
ON public.trips FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Users can view trips they're invited to"
ON public.trips FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = trips.id
    AND user_id = auth.uid()
    AND status IN ('invited', 'confirmed')
  )
);

CREATE POLICY "Users can create trips"
ON public.trips FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their trips"
ON public.trips FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their trips"
ON public.trips FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Trip participants policies
CREATE POLICY "Trip owners can manage participants"
ON public.trip_participants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = trip_participants.trip_id
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Participants can view their participation"
ON public.trip_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Participants can update their own status"
ON public.trip_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trip recommendations policies
CREATE POLICY "Participants can view recommendations"
ON public.trip_recommendations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = trip_recommendations.trip_id
    AND user_id = auth.uid()
    AND status = 'confirmed'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = trip_recommendations.trip_id
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Participants can add recommendations"
ON public.trip_recommendations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_id = trip_recommendations.trip_id
      AND user_id = auth.uid()
      AND status = 'confirmed'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = trip_recommendations.trip_id
      AND owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own recommendations"
ON public.trip_recommendations FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recommendations"
ON public.trip_recommendations FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Add updated_at trigger to trips
CREATE TRIGGER update_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
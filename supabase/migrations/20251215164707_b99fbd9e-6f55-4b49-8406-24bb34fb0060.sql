-- Enum for resource categories
CREATE TYPE resource_category AS ENUM (
  'accommodation',
  'transportation', 
  'money',
  'reservation',
  'document',
  'communication',
  'other'
);

-- Resources table
CREATE TABLE public.trip_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  category resource_category NOT NULL DEFAULT 'other',
  title VARCHAR(200) NOT NULL,
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_resources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Trip participants can view resources"
  ON public.trip_resources FOR SELECT
  USING (is_trip_owner(auth.uid(), trip_id) OR is_trip_participant(auth.uid(), trip_id));

CREATE POLICY "Trip participants can add resources"
  ON public.trip_resources FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (is_trip_owner(auth.uid(), trip_id) OR is_trip_participant(auth.uid(), trip_id)));

CREATE POLICY "Users can update their own resources"
  ON public.trip_resources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resources"
  ON public.trip_resources FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_trip_resources_updated_at
  BEFORE UPDATE ON public.trip_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
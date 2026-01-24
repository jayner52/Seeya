-- Add new category values to resource_category enum
ALTER TYPE resource_category ADD VALUE IF NOT EXISTS 'flight';
ALTER TYPE resource_category ADD VALUE IF NOT EXISTS 'rental_car';
ALTER TYPE resource_category ADD VALUE IF NOT EXISTS 'activity';

-- Add date columns to trip_resources table
ALTER TABLE trip_resources 
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- Create resource_participants junction table
CREATE TABLE IF NOT EXISTS public.resource_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid REFERENCES trip_resources(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(resource_id, user_id)
);

-- Enable RLS
ALTER TABLE public.resource_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Trip participants can view resource participants
CREATE POLICY "Trip participants can view resource participants"
  ON public.resource_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trip_resources tr
    WHERE tr.id = resource_id
    AND (is_trip_owner(auth.uid(), tr.trip_id) OR is_trip_participant(auth.uid(), tr.trip_id))
  ));

-- Policy: Trip participants can insert resource participants
CREATE POLICY "Trip participants can insert resource participants"
  ON public.resource_participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM trip_resources tr
    WHERE tr.id = resource_id
    AND (is_trip_owner(auth.uid(), tr.trip_id) OR is_trip_participant(auth.uid(), tr.trip_id))
  ));

-- Policy: Trip participants can delete resource participants
CREATE POLICY "Trip participants can delete resource participants"
  ON public.resource_participants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM trip_resources tr
    WHERE tr.id = resource_id
    AND (is_trip_owner(auth.uid(), tr.trip_id) OR is_trip_participant(auth.uid(), tr.trip_id))
  ));
-- Add location_id to trip_recommendations for grouping recommendations by location
ALTER TABLE public.trip_recommendations 
ADD COLUMN location_id uuid REFERENCES public.trip_locations(id) ON DELETE SET NULL;
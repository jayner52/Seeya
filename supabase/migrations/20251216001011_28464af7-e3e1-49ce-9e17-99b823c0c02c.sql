-- Drop the existing check constraint and add a new one that allows google_place_id as an alternative
ALTER TABLE public.shared_recommendations DROP CONSTRAINT IF EXISTS shared_recommendations_location_check;

ALTER TABLE public.shared_recommendations ADD CONSTRAINT shared_recommendations_location_check 
CHECK (city_id IS NOT NULL OR country_id IS NOT NULL OR google_place_id IS NOT NULL);
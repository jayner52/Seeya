-- Fix trip creation error 42703: rename trip_locations columns to match
-- the RPC (create_trip_with_locations) and frontend TypeScript types.
--
-- Table currently has: destination, start_date, end_date
-- RPC + frontend expect: custom_location, arrival_date, departure_date

ALTER TABLE public.trip_locations RENAME COLUMN destination TO custom_location;
ALTER TABLE public.trip_locations RENAME COLUMN start_date TO arrival_date;
ALTER TABLE public.trip_locations RENAME COLUMN end_date TO departure_date;

-- Add country_id column (iOS app sends this but the column was never created)
ALTER TABLE public.trip_locations ADD COLUMN country_id UUID REFERENCES public.countries(id);

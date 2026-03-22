-- Add arrival_date and departure_date columns to trip_locations.
-- These columns were expected by the create_trip_with_locations RPC
-- but never existed in the table.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trip_locations' AND column_name = 'arrival_date') THEN
    ALTER TABLE public.trip_locations ADD COLUMN arrival_date date;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trip_locations' AND column_name = 'departure_date') THEN
    ALTER TABLE public.trip_locations ADD COLUMN departure_date date;
  END IF;
END $$;

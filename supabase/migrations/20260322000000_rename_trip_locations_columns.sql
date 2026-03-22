-- Fix trip_locations columns: rename if old names exist, add country_id.
-- Production may already have the renames from an earlier migration,
-- so we use DO blocks to make this idempotent.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trip_locations' AND column_name = 'destination') THEN
    ALTER TABLE public.trip_locations RENAME COLUMN destination TO custom_location;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trip_locations' AND column_name = 'start_date') THEN
    ALTER TABLE public.trip_locations RENAME COLUMN start_date TO arrival_date;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trip_locations' AND column_name = 'end_date') THEN
    ALTER TABLE public.trip_locations RENAME COLUMN end_date TO departure_date;
  END IF;
END $$;

-- Add country_id column (iOS app sends this but the column was never created)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trip_locations' AND column_name = 'country_id') THEN
    ALTER TABLE public.trip_locations ADD COLUMN country_id UUID REFERENCES public.countries(id);
  END IF;
END $$;

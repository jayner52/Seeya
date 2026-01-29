-- Add flag to identify logged past trips
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS is_logged_past_trip BOOLEAN DEFAULT false;
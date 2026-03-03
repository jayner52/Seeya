-- Add url column to trip_bits
-- The frontend AddTripBitSheet stores a link (flight booking URL, reservation link, etc.)
-- against a trip bit. This column was missing from the initial schema.

ALTER TABLE public.trip_bits
  ADD COLUMN IF NOT EXISTS url TEXT;

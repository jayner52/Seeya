-- Add cover_photo_city column to trips table.
-- This stores which city's Unsplash photo is used as the trip cover.
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS cover_photo_city TEXT;

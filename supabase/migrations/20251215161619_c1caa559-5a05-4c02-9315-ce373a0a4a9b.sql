-- Add flexible dates columns to trips table
ALTER TABLE public.trips 
ADD COLUMN is_flexible_dates boolean NOT NULL DEFAULT false,
ADD COLUMN flexible_month text;
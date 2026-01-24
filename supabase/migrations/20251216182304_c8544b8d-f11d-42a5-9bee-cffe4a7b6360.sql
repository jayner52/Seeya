-- Add visibility columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_visibility text DEFAULT 'friends_only';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trips_visibility text DEFAULT 'friends_only';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recommendations_visibility text DEFAULT 'friends_only';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wanderlist_visibility text DEFAULT 'friends_only';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS travel_pals_visibility text DEFAULT 'friends_only';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stats_visibility text DEFAULT 'friends_only';
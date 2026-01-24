-- Add onboarding_completed column to profiles
ALTER TABLE public.profiles 
ADD COLUMN onboarding_completed boolean DEFAULT false;

-- Mark all existing users as having completed onboarding (so they don't see it)
UPDATE public.profiles SET onboarding_completed = true WHERE created_at < NOW() - INTERVAL '1 hour';
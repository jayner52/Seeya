-- Add homebase city to profiles
ALTER TABLE public.profiles 
ADD COLUMN homebase_city TEXT,
ADD COLUMN homebase_city_id UUID REFERENCES public.cities(id),
ADD COLUMN homebase_google_place_id TEXT;
-- Create shared_recommendations table
CREATE TABLE public.shared_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category public.recommendation_category NOT NULL DEFAULT 'tip',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  tips TEXT,
  url TEXT,
  google_place_id TEXT,
  source_resource_id UUID REFERENCES public.trip_resources(id) ON DELETE SET NULL,
  source_trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own shared recommendations
CREATE POLICY "Users can manage own shared recommendations"
ON public.shared_recommendations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can view shared recommendations from accepted friends
CREATE POLICY "Users can view friend recommendations"
ON public.shared_recommendations
FOR SELECT
USING (public.are_friends(auth.uid(), user_id));

-- Create index for efficient querying by city
CREATE INDEX idx_shared_recommendations_city ON public.shared_recommendations(city_id);
CREATE INDEX idx_shared_recommendations_user ON public.shared_recommendations(user_id);
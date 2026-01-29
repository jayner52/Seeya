-- Create saved_recommendations table for user wishlists
CREATE TABLE public.saved_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shared_recommendation_id UUID NOT NULL REFERENCES public.shared_recommendations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, shared_recommendation_id)
);

-- Enable RLS
ALTER TABLE public.saved_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own saved recommendations
CREATE POLICY "Users can manage own saved recommendations"
ON public.saved_recommendations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only save recommendations they have access to view
CREATE POLICY "Users can only save visible recommendations"
ON public.saved_recommendations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.shared_recommendations sr
    WHERE sr.id = shared_recommendation_id
    AND (are_friends(auth.uid(), sr.user_id) OR shares_trip_with(auth.uid(), sr.user_id))
  )
);
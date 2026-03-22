-- Create wanderlist_items table (the code references this table, not the old "wanderlist" table)
CREATE TABLE IF NOT EXISTS public.wanderlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_name TEXT NOT NULL,
  place_id TEXT,
  country TEXT,
  continent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, place_name)
);

ALTER TABLE public.wanderlist_items ENABLE ROW LEVEL SECURITY;

-- Users can manage their own wanderlist items
CREATE POLICY "Users can manage own wanderlist_items" ON public.wanderlist_items
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Friends can view wanderlist items (uses existing are_friends function)
CREATE POLICY "Friends can view wanderlist_items" ON public.wanderlist_items
  FOR SELECT USING (
    auth.uid() = user_id
    OR are_friends(auth.uid(), user_id)
    OR shares_trip_with(auth.uid(), user_id)
  );

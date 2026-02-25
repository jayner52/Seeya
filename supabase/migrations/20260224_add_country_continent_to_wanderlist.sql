ALTER TABLE public.wanderlist_items
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS continent TEXT;

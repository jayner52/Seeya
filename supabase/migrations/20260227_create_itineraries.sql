-- Create itineraries table
CREATE TABLE itineraries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  trip_id       UUID REFERENCES trips ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  destination   TEXT NOT NULL,
  duration_days INT,
  share_code    TEXT UNIQUE NOT NULL DEFAULT substring(gen_random_uuid()::text, 1, 8),
  is_published  BOOLEAN NOT NULL DEFAULT false,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  view_count    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create itinerary_items table (snapshot — no FK to trip_bits for stability)
CREATE TABLE itinerary_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id   UUID NOT NULL REFERENCES itineraries ON DELETE CASCADE,
  day_number     INT,
  order_index    INT NOT NULL DEFAULT 0,
  category       TEXT NOT NULL,
  title          TEXT NOT NULL,
  notes          TEXT,
  start_time     TEXT,
  location_name  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

-- itineraries policies
CREATE POLICY "Public itineraries readable by anyone"
  ON itineraries FOR SELECT USING (is_published = true);

CREATE POLICY "Owner can read own itineraries"
  ON itineraries FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Owner can insert itineraries"
  ON itineraries FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owner can update itineraries without changing featured flag"
  ON itineraries FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (
    created_by = auth.uid()
    AND is_featured = (SELECT is_featured FROM itineraries WHERE id = itineraries.id)
  );

CREATE POLICY "Owner can delete itineraries"
  ON itineraries FOR DELETE USING (created_by = auth.uid());

-- itinerary_items policies
CREATE POLICY "Public items readable if itinerary is published"
  ON itinerary_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM itineraries WHERE id = itinerary_id AND is_published = true)
  );

CREATE POLICY "Owner can read own itinerary items"
  ON itinerary_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM itineraries WHERE id = itinerary_id AND created_by = auth.uid())
  );

CREATE POLICY "Owner can manage items"
  ON itinerary_items FOR ALL USING (
    EXISTS (SELECT 1 FROM itineraries WHERE id = itinerary_id AND created_by = auth.uid())
  );

-- updated_at trigger for itineraries
CREATE OR REPLACE FUNCTION update_itineraries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW EXECUTE FUNCTION update_itineraries_updated_at();

-- Index for share_code lookups
CREATE INDEX idx_itineraries_share_code ON itineraries(share_code);

-- Index for featured itineraries
CREATE INDEX idx_itineraries_featured ON itineraries(is_featured, is_published) WHERE is_featured = true AND is_published = true;

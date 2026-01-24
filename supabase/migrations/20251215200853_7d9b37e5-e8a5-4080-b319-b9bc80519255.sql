-- Add metadata column for category-specific fields
ALTER TABLE trip_resources ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
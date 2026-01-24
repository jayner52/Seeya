-- Add location_id column to trip_resources table
ALTER TABLE trip_resources 
ADD COLUMN location_id uuid REFERENCES trip_locations(id) ON DELETE SET NULL;
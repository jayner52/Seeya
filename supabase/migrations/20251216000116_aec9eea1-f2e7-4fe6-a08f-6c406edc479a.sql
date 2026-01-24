-- Make trip dates nullable for flexible date logging
ALTER TABLE trips ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN end_date DROP NOT NULL;

-- Add country_id to shared_recommendations for country-level recommendations
ALTER TABLE shared_recommendations ADD COLUMN country_id UUID REFERENCES countries(id);

-- Make city_id nullable (can have country-only recommendations)
ALTER TABLE shared_recommendations ALTER COLUMN city_id DROP NOT NULL;

-- Add constraint: at least one of city_id or country_id must be set
ALTER TABLE shared_recommendations ADD CONSTRAINT location_required 
  CHECK (city_id IS NOT NULL OR country_id IS NOT NULL);
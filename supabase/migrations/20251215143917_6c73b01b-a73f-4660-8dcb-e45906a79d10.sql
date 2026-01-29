-- Create countries table
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL,
  continent TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cities table
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  google_place_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip_types table
CREATE TABLE public.trip_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to trips table
ALTER TABLE public.trips ADD COLUMN city_id UUID REFERENCES public.cities(id);
ALTER TABLE public.trips ADD COLUMN trip_type_id UUID REFERENCES public.trip_types(id);

-- Enable RLS on new tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_types ENABLE ROW LEVEL SECURITY;

-- Countries and cities are public read (reference data)
CREATE POLICY "Anyone can view countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Anyone can view cities" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Anyone can view trip types" ON public.trip_types FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_cities_country_id ON public.cities(country_id);
CREATE INDEX idx_cities_name ON public.cities(name);
CREATE INDEX idx_trips_city_id ON public.trips(city_id);
CREATE INDEX idx_trips_trip_type_id ON public.trips(trip_type_id);

-- Seed trip types
INSERT INTO public.trip_types (name, slug, icon, color, description) VALUES
  ('Bachelorette', 'bachelorette', 'PartyPopper', 'pink', 'Girls'' getaway celebration'),
  ('Honeymoon', 'honeymoon', 'Heart', 'rose', 'Romantic post-wedding escape'),
  ('Family Vacation', 'family', 'Users', 'blue', 'Fun for all ages'),
  ('Adventure', 'adventure', 'Mountain', 'green', 'Outdoor thrills & exploration'),
  ('Beach Getaway', 'beach', 'Umbrella', 'cyan', 'Sun, sand, and relaxation'),
  ('City Break', 'city', 'Building2', 'purple', 'Urban exploration'),
  ('Foodie Trip', 'foodie', 'UtensilsCrossed', 'orange', 'Culinary adventures'),
  ('Ski Trip', 'ski', 'Snowflake', 'sky', 'Winter wonderland'),
  ('Girls Trip', 'girls', 'Sparkles', 'fuchsia', 'Friends getaway'),
  ('Guys Trip', 'guys', 'Beer', 'amber', 'Bros adventure'),
  ('Workation', 'workation', 'Laptop', 'slate', 'Work + vacation blend'),
  ('Other', 'other', 'Compass', 'gray', 'Custom trip');

-- Seed countries (popular travel destinations)
INSERT INTO public.countries (name, code, emoji, continent) VALUES
  ('France', 'FR', '🇫🇷', 'Europe'),
  ('Italy', 'IT', '🇮🇹', 'Europe'),
  ('Spain', 'ES', '🇪🇸', 'Europe'),
  ('United Kingdom', 'GB', '🇬🇧', 'Europe'),
  ('Greece', 'GR', '🇬🇷', 'Europe'),
  ('Portugal', 'PT', '🇵🇹', 'Europe'),
  ('Netherlands', 'NL', '🇳🇱', 'Europe'),
  ('Germany', 'DE', '🇩🇪', 'Europe'),
  ('Switzerland', 'CH', '🇨🇭', 'Europe'),
  ('Austria', 'AT', '🇦🇹', 'Europe'),
  ('Croatia', 'HR', '🇭🇷', 'Europe'),
  ('Czech Republic', 'CZ', '🇨🇿', 'Europe'),
  ('Iceland', 'IS', '🇮🇸', 'Europe'),
  ('Ireland', 'IE', '🇮🇪', 'Europe'),
  ('Norway', 'NO', '🇳🇴', 'Europe'),
  ('Sweden', 'SE', '🇸🇪', 'Europe'),
  ('United States', 'US', '🇺🇸', 'North America'),
  ('Canada', 'CA', '🇨🇦', 'North America'),
  ('Mexico', 'MX', '🇲🇽', 'North America'),
  ('Costa Rica', 'CR', '🇨🇷', 'North America'),
  ('Brazil', 'BR', '🇧🇷', 'South America'),
  ('Argentina', 'AR', '🇦🇷', 'South America'),
  ('Colombia', 'CO', '🇨🇴', 'South America'),
  ('Peru', 'PE', '🇵🇪', 'South America'),
  ('Japan', 'JP', '🇯🇵', 'Asia'),
  ('Thailand', 'TH', '🇹🇭', 'Asia'),
  ('Indonesia', 'ID', '🇮🇩', 'Asia'),
  ('Vietnam', 'VN', '🇻🇳', 'Asia'),
  ('South Korea', 'KR', '🇰🇷', 'Asia'),
  ('Singapore', 'SG', '🇸🇬', 'Asia'),
  ('Philippines', 'PH', '🇵🇭', 'Asia'),
  ('India', 'IN', '🇮🇳', 'Asia'),
  ('United Arab Emirates', 'AE', '🇦🇪', 'Asia'),
  ('Maldives', 'MV', '🇲🇻', 'Asia'),
  ('Australia', 'AU', '🇦🇺', 'Oceania'),
  ('New Zealand', 'NZ', '🇳🇿', 'Oceania'),
  ('Fiji', 'FJ', '🇫🇯', 'Oceania'),
  ('Morocco', 'MA', '🇲🇦', 'Africa'),
  ('South Africa', 'ZA', '🇿🇦', 'Africa'),
  ('Egypt', 'EG', '🇪🇬', 'Africa'),
  ('Kenya', 'KE', '🇰🇪', 'Africa'),
  ('Tanzania', 'TZ', '🇹🇿', 'Africa');

-- Seed cities
INSERT INTO public.cities (country_id, name, region, latitude, longitude) VALUES
  -- France
  ((SELECT id FROM public.countries WHERE code = 'FR'), 'Paris', 'Île-de-France', 48.8566, 2.3522),
  ((SELECT id FROM public.countries WHERE code = 'FR'), 'Nice', 'Provence-Alpes-Côte d''Azur', 43.7102, 7.2620),
  ((SELECT id FROM public.countries WHERE code = 'FR'), 'Lyon', 'Auvergne-Rhône-Alpes', 45.7640, 4.8357),
  ((SELECT id FROM public.countries WHERE code = 'FR'), 'Bordeaux', 'Nouvelle-Aquitaine', 44.8378, -0.5792),
  ((SELECT id FROM public.countries WHERE code = 'FR'), 'Marseille', 'Provence-Alpes-Côte d''Azur', 43.2965, 5.3698),
  -- Italy
  ((SELECT id FROM public.countries WHERE code = 'IT'), 'Rome', 'Lazio', 41.9028, 12.4964),
  ((SELECT id FROM public.countries WHERE code = 'IT'), 'Florence', 'Tuscany', 43.7696, 11.2558),
  ((SELECT id FROM public.countries WHERE code = 'IT'), 'Venice', 'Veneto', 45.4408, 12.3155),
  ((SELECT id FROM public.countries WHERE code = 'IT'), 'Milan', 'Lombardy', 45.4642, 9.1900),
  ((SELECT id FROM public.countries WHERE code = 'IT'), 'Amalfi Coast', 'Campania', 40.6340, 14.6027),
  -- Spain
  ((SELECT id FROM public.countries WHERE code = 'ES'), 'Barcelona', 'Catalonia', 41.3851, 2.1734),
  ((SELECT id FROM public.countries WHERE code = 'ES'), 'Madrid', 'Community of Madrid', 40.4168, -3.7038),
  ((SELECT id FROM public.countries WHERE code = 'ES'), 'Seville', 'Andalusia', 37.3891, -5.9845),
  ((SELECT id FROM public.countries WHERE code = 'ES'), 'Ibiza', 'Balearic Islands', 38.9067, 1.4206),
  ((SELECT id FROM public.countries WHERE code = 'ES'), 'Mallorca', 'Balearic Islands', 39.6953, 3.0176),
  -- UK
  ((SELECT id FROM public.countries WHERE code = 'GB'), 'London', 'England', 51.5074, -0.1278),
  ((SELECT id FROM public.countries WHERE code = 'GB'), 'Edinburgh', 'Scotland', 55.9533, -3.1883),
  ((SELECT id FROM public.countries WHERE code = 'GB'), 'Manchester', 'England', 53.4808, -2.2426),
  -- Greece
  ((SELECT id FROM public.countries WHERE code = 'GR'), 'Athens', 'Attica', 37.9838, 23.7275),
  ((SELECT id FROM public.countries WHERE code = 'GR'), 'Santorini', 'South Aegean', 36.3932, 25.4615),
  ((SELECT id FROM public.countries WHERE code = 'GR'), 'Mykonos', 'South Aegean', 37.4467, 25.3289),
  ((SELECT id FROM public.countries WHERE code = 'GR'), 'Crete', 'Crete', 35.2401, 24.8093),
  -- Portugal
  ((SELECT id FROM public.countries WHERE code = 'PT'), 'Lisbon', 'Lisbon', 38.7223, -9.1393),
  ((SELECT id FROM public.countries WHERE code = 'PT'), 'Porto', 'Norte', 41.1579, -8.6291),
  ((SELECT id FROM public.countries WHERE code = 'PT'), 'Algarve', 'Algarve', 37.0179, -7.9304),
  -- Netherlands
  ((SELECT id FROM public.countries WHERE code = 'NL'), 'Amsterdam', 'North Holland', 52.3676, 4.9041),
  -- Germany
  ((SELECT id FROM public.countries WHERE code = 'DE'), 'Berlin', 'Berlin', 52.5200, 13.4050),
  ((SELECT id FROM public.countries WHERE code = 'DE'), 'Munich', 'Bavaria', 48.1351, 11.5820),
  -- Switzerland
  ((SELECT id FROM public.countries WHERE code = 'CH'), 'Zurich', 'Zürich', 47.3769, 8.5417),
  ((SELECT id FROM public.countries WHERE code = 'CH'), 'Geneva', 'Geneva', 46.2044, 6.1432),
  ((SELECT id FROM public.countries WHERE code = 'CH'), 'Interlaken', 'Bern', 46.6863, 7.8632),
  -- Austria
  ((SELECT id FROM public.countries WHERE code = 'AT'), 'Vienna', 'Vienna', 48.2082, 16.3738),
  ((SELECT id FROM public.countries WHERE code = 'AT'), 'Salzburg', 'Salzburg', 47.8095, 13.0550),
  -- Croatia
  ((SELECT id FROM public.countries WHERE code = 'HR'), 'Dubrovnik', 'Dubrovnik-Neretva', 42.6507, 18.0944),
  ((SELECT id FROM public.countries WHERE code = 'HR'), 'Split', 'Split-Dalmatia', 43.5081, 16.4402),
  -- Czech Republic
  ((SELECT id FROM public.countries WHERE code = 'CZ'), 'Prague', 'Prague', 50.0755, 14.4378),
  -- Iceland
  ((SELECT id FROM public.countries WHERE code = 'IS'), 'Reykjavik', 'Capital Region', 64.1466, -21.9426),
  -- Ireland
  ((SELECT id FROM public.countries WHERE code = 'IE'), 'Dublin', 'Leinster', 53.3498, -6.2603),
  -- Norway
  ((SELECT id FROM public.countries WHERE code = 'NO'), 'Oslo', 'Oslo', 59.9139, 10.7522),
  ((SELECT id FROM public.countries WHERE code = 'NO'), 'Bergen', 'Vestland', 60.3913, 5.3221),
  -- Sweden
  ((SELECT id FROM public.countries WHERE code = 'SE'), 'Stockholm', 'Stockholm', 59.3293, 18.0686),
  -- USA
  ((SELECT id FROM public.countries WHERE code = 'US'), 'New York', 'New York', 40.7128, -74.0060),
  ((SELECT id FROM public.countries WHERE code = 'US'), 'Los Angeles', 'California', 34.0522, -118.2437),
  ((SELECT id FROM public.countries WHERE code = 'US'), 'Miami', 'Florida', 25.7617, -80.1918),
  ((SELECT id FROM public.countries WHERE code = 'US'), 'Las Vegas', 'Nevada', 36.1699, -115.1398),
  ((SELECT id FROM public.countries WHERE code = 'US'), 'San Francisco', 'California', 37.7749, -122.4194),
  ((SELECT id FROM public.countries WHERE code = 'US'), 'Hawaii', 'Hawaii', 19.8968, -155.5828),
  ((SELECT id FROM public.countries WHERE code = 'US'), 'Nashville', 'Tennessee', 36.1627, -86.7816),
  ((SELECT id FROM public.countries WHERE code = 'US'), 'New Orleans', 'Louisiana', 29.9511, -90.0715),
  ((SELECT id FROM public.countries WHERE code = 'US'), 'Austin', 'Texas', 30.2672, -97.7431),
  ((SELECT id FROM public.countries WHERE code = 'US'), 'Scottsdale', 'Arizona', 33.4942, -111.9261),
  -- Canada
  ((SELECT id FROM public.countries WHERE code = 'CA'), 'Vancouver', 'British Columbia', 49.2827, -123.1207),
  ((SELECT id FROM public.countries WHERE code = 'CA'), 'Toronto', 'Ontario', 43.6532, -79.3832),
  ((SELECT id FROM public.countries WHERE code = 'CA'), 'Montreal', 'Quebec', 45.5017, -73.5673),
  ((SELECT id FROM public.countries WHERE code = 'CA'), 'Banff', 'Alberta', 51.1784, -115.5708),
  -- Mexico
  ((SELECT id FROM public.countries WHERE code = 'MX'), 'Cancun', 'Quintana Roo', 21.1619, -86.8515),
  ((SELECT id FROM public.countries WHERE code = 'MX'), 'Mexico City', 'Mexico City', 19.4326, -99.1332),
  ((SELECT id FROM public.countries WHERE code = 'MX'), 'Cabo San Lucas', 'Baja California Sur', 22.8905, -109.9167),
  ((SELECT id FROM public.countries WHERE code = 'MX'), 'Tulum', 'Quintana Roo', 20.2114, -87.4654),
  -- Costa Rica
  ((SELECT id FROM public.countries WHERE code = 'CR'), 'San José', 'San José', 9.9281, -84.0907),
  ((SELECT id FROM public.countries WHERE code = 'CR'), 'Guanacaste', 'Guanacaste', 10.4274, -85.4520),
  -- Brazil
  ((SELECT id FROM public.countries WHERE code = 'BR'), 'Rio de Janeiro', 'Rio de Janeiro', -22.9068, -43.1729),
  ((SELECT id FROM public.countries WHERE code = 'BR'), 'São Paulo', 'São Paulo', -23.5505, -46.6333),
  -- Argentina
  ((SELECT id FROM public.countries WHERE code = 'AR'), 'Buenos Aires', 'Buenos Aires', -34.6037, -58.3816),
  -- Colombia
  ((SELECT id FROM public.countries WHERE code = 'CO'), 'Cartagena', 'Bolívar', 10.3910, -75.4794),
  ((SELECT id FROM public.countries WHERE code = 'CO'), 'Medellín', 'Antioquia', 6.2476, -75.5658),
  -- Peru
  ((SELECT id FROM public.countries WHERE code = 'PE'), 'Lima', 'Lima', -12.0464, -77.0428),
  ((SELECT id FROM public.countries WHERE code = 'PE'), 'Cusco', 'Cusco', -13.5319, -71.9675),
  -- Japan
  ((SELECT id FROM public.countries WHERE code = 'JP'), 'Tokyo', 'Tokyo', 35.6762, 139.6503),
  ((SELECT id FROM public.countries WHERE code = 'JP'), 'Kyoto', 'Kyoto', 35.0116, 135.7681),
  ((SELECT id FROM public.countries WHERE code = 'JP'), 'Osaka', 'Osaka', 34.6937, 135.5023),
  -- Thailand
  ((SELECT id FROM public.countries WHERE code = 'TH'), 'Bangkok', 'Bangkok', 13.7563, 100.5018),
  ((SELECT id FROM public.countries WHERE code = 'TH'), 'Phuket', 'Phuket', 7.8804, 98.3923),
  ((SELECT id FROM public.countries WHERE code = 'TH'), 'Chiang Mai', 'Chiang Mai', 18.7883, 98.9853),
  -- Indonesia
  ((SELECT id FROM public.countries WHERE code = 'ID'), 'Bali', 'Bali', -8.3405, 115.0920),
  ((SELECT id FROM public.countries WHERE code = 'ID'), 'Jakarta', 'Jakarta', -6.2088, 106.8456),
  -- Vietnam
  ((SELECT id FROM public.countries WHERE code = 'VN'), 'Ho Chi Minh City', 'Ho Chi Minh City', 10.8231, 106.6297),
  ((SELECT id FROM public.countries WHERE code = 'VN'), 'Hanoi', 'Hanoi', 21.0278, 105.8342),
  -- South Korea
  ((SELECT id FROM public.countries WHERE code = 'KR'), 'Seoul', 'Seoul', 37.5665, 126.9780),
  ((SELECT id FROM public.countries WHERE code = 'KR'), 'Busan', 'Busan', 35.1796, 129.0756),
  -- Singapore
  ((SELECT id FROM public.countries WHERE code = 'SG'), 'Singapore', NULL, 1.3521, 103.8198),
  -- Philippines
  ((SELECT id FROM public.countries WHERE code = 'PH'), 'Manila', 'Metro Manila', 14.5995, 120.9842),
  ((SELECT id FROM public.countries WHERE code = 'PH'), 'Palawan', 'Palawan', 9.8349, 118.7384),
  -- India
  ((SELECT id FROM public.countries WHERE code = 'IN'), 'Mumbai', 'Maharashtra', 19.0760, 72.8777),
  ((SELECT id FROM public.countries WHERE code = 'IN'), 'New Delhi', 'Delhi', 28.6139, 77.2090),
  ((SELECT id FROM public.countries WHERE code = 'IN'), 'Goa', 'Goa', 15.2993, 74.1240),
  -- UAE
  ((SELECT id FROM public.countries WHERE code = 'AE'), 'Dubai', 'Dubai', 25.2048, 55.2708),
  ((SELECT id FROM public.countries WHERE code = 'AE'), 'Abu Dhabi', 'Abu Dhabi', 24.4539, 54.3773),
  -- Maldives
  ((SELECT id FROM public.countries WHERE code = 'MV'), 'Malé', 'Malé', 4.1755, 73.5093),
  -- Australia
  ((SELECT id FROM public.countries WHERE code = 'AU'), 'Sydney', 'New South Wales', -33.8688, 151.2093),
  ((SELECT id FROM public.countries WHERE code = 'AU'), 'Melbourne', 'Victoria', -37.8136, 144.9631),
  ((SELECT id FROM public.countries WHERE code = 'AU'), 'Gold Coast', 'Queensland', -28.0167, 153.4000),
  -- New Zealand
  ((SELECT id FROM public.countries WHERE code = 'NZ'), 'Auckland', 'Auckland', -36.8485, 174.7633),
  ((SELECT id FROM public.countries WHERE code = 'NZ'), 'Queenstown', 'Otago', -45.0312, 168.6626),
  -- Fiji
  ((SELECT id FROM public.countries WHERE code = 'FJ'), 'Nadi', 'Western', -17.7765, 177.4356),
  -- Morocco
  ((SELECT id FROM public.countries WHERE code = 'MA'), 'Marrakech', 'Marrakech-Safi', 31.6295, -7.9811),
  ((SELECT id FROM public.countries WHERE code = 'MA'), 'Casablanca', 'Casablanca-Settat', 33.5731, -7.5898),
  -- South Africa
  ((SELECT id FROM public.countries WHERE code = 'ZA'), 'Cape Town', 'Western Cape', -33.9249, 18.4241),
  ((SELECT id FROM public.countries WHERE code = 'ZA'), 'Johannesburg', 'Gauteng', -26.2041, 28.0473),
  -- Egypt
  ((SELECT id FROM public.countries WHERE code = 'EG'), 'Cairo', 'Cairo', 30.0444, 31.2357),
  ((SELECT id FROM public.countries WHERE code = 'EG'), 'Luxor', 'Luxor', 25.6872, 32.6396),
  -- Kenya
  ((SELECT id FROM public.countries WHERE code = 'KE'), 'Nairobi', 'Nairobi', -1.2921, 36.8219),
  -- Tanzania
  ((SELECT id FROM public.countries WHERE code = 'TZ'), 'Zanzibar', 'Zanzibar', -6.1659, 39.2026);
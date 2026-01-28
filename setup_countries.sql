-- Create continents table
CREATE TABLE IF NOT EXISTS continents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert continents
INSERT INTO continents (name, order_index) VALUES
    ('Europe', 1),
    ('Asia', 2),
    ('North America', 3),
    ('South America', 4),
    ('Africa', 5),
    ('Oceania', 6),
    ('Antarctica', 7)
ON CONFLICT (name) DO NOTHING;

-- Add continent_id to countries if it doesn't exist
ALTER TABLE countries ADD COLUMN IF NOT EXISTS continent_id UUID REFERENCES continents(id);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS flag_emoji TEXT;

-- Clear existing countries and repopulate
DELETE FROM countries;

-- Insert countries with continent references
INSERT INTO countries (name, code, flag_emoji, continent_id)
SELECT name, code, flag_emoji, (SELECT id FROM continents WHERE continents.name = continent_name)
FROM (VALUES
    -- Europe
    ('France', 'FR', '🇫🇷', 'Europe'),
    ('Germany', 'DE', '🇩🇪', 'Europe'),
    ('Italy', 'IT', '🇮🇹', 'Europe'),
    ('Spain', 'ES', '🇪🇸', 'Europe'),
    ('Portugal', 'PT', '🇵🇹', 'Europe'),
    ('United Kingdom', 'GB', '🇬🇧', 'Europe'),
    ('Netherlands', 'NL', '🇳🇱', 'Europe'),
    ('Belgium', 'BE', '🇧🇪', 'Europe'),
    ('Switzerland', 'CH', '🇨🇭', 'Europe'),
    ('Austria', 'AT', '🇦🇹', 'Europe'),
    ('Greece', 'GR', '🇬🇷', 'Europe'),
    ('Sweden', 'SE', '🇸🇪', 'Europe'),
    ('Norway', 'NO', '🇳🇴', 'Europe'),
    ('Denmark', 'DK', '🇩🇰', 'Europe'),
    ('Finland', 'FI', '🇫🇮', 'Europe'),
    ('Ireland', 'IE', '🇮🇪', 'Europe'),
    ('Poland', 'PL', '🇵🇱', 'Europe'),
    ('Czech Republic', 'CZ', '🇨🇿', 'Europe'),
    ('Hungary', 'HU', '🇭🇺', 'Europe'),
    ('Croatia', 'HR', '🇭🇷', 'Europe'),
    ('Iceland', 'IS', '🇮🇸', 'Europe'),
    ('Romania', 'RO', '🇷🇴', 'Europe'),
    ('Bulgaria', 'BG', '🇧🇬', 'Europe'),
    ('Slovenia', 'SI', '🇸🇮', 'Europe'),
    ('Slovakia', 'SK', '🇸🇰', 'Europe'),
    ('Estonia', 'EE', '🇪🇪', 'Europe'),
    ('Latvia', 'LV', '🇱🇻', 'Europe'),
    ('Lithuania', 'LT', '🇱🇹', 'Europe'),
    ('Malta', 'MT', '🇲🇹', 'Europe'),
    ('Cyprus', 'CY', '🇨🇾', 'Europe'),
    ('Luxembourg', 'LU', '🇱🇺', 'Europe'),
    ('Monaco', 'MC', '🇲🇨', 'Europe'),

    -- Asia
    ('Japan', 'JP', '🇯🇵', 'Asia'),
    ('China', 'CN', '🇨🇳', 'Asia'),
    ('South Korea', 'KR', '🇰🇷', 'Asia'),
    ('Thailand', 'TH', '🇹🇭', 'Asia'),
    ('Vietnam', 'VN', '🇻🇳', 'Asia'),
    ('Indonesia', 'ID', '🇮🇩', 'Asia'),
    ('Malaysia', 'MY', '🇲🇾', 'Asia'),
    ('Singapore', 'SG', '🇸🇬', 'Asia'),
    ('Philippines', 'PH', '🇵🇭', 'Asia'),
    ('India', 'IN', '🇮🇳', 'Asia'),
    ('Nepal', 'NP', '🇳🇵', 'Asia'),
    ('Sri Lanka', 'LK', '🇱🇰', 'Asia'),
    ('Cambodia', 'KH', '🇰🇭', 'Asia'),
    ('Laos', 'LA', '🇱🇦', 'Asia'),
    ('Myanmar', 'MM', '🇲🇲', 'Asia'),
    ('Taiwan', 'TW', '🇹🇼', 'Asia'),
    ('Hong Kong', 'HK', '🇭🇰', 'Asia'),
    ('Maldives', 'MV', '🇲🇻', 'Asia'),
    ('Mongolia', 'MN', '🇲🇳', 'Asia'),
    ('Bangladesh', 'BD', '🇧🇩', 'Asia'),
    ('Pakistan', 'PK', '🇵🇰', 'Asia'),

    -- Middle East (part of Asia)
    ('United Arab Emirates', 'AE', '🇦🇪', 'Asia'),
    ('Israel', 'IL', '🇮🇱', 'Asia'),
    ('Jordan', 'JO', '🇯🇴', 'Asia'),
    ('Turkey', 'TR', '🇹🇷', 'Asia'),
    ('Saudi Arabia', 'SA', '🇸🇦', 'Asia'),
    ('Qatar', 'QA', '🇶🇦', 'Asia'),
    ('Oman', 'OM', '🇴🇲', 'Asia'),
    ('Lebanon', 'LB', '🇱🇧', 'Asia'),

    -- North America
    ('United States', 'US', '🇺🇸', 'North America'),
    ('Canada', 'CA', '🇨🇦', 'North America'),
    ('Mexico', 'MX', '🇲🇽', 'North America'),
    ('Costa Rica', 'CR', '🇨🇷', 'North America'),
    ('Panama', 'PA', '🇵🇦', 'North America'),
    ('Guatemala', 'GT', '🇬🇹', 'North America'),
    ('Cuba', 'CU', '🇨🇺', 'North America'),
    ('Jamaica', 'JM', '🇯🇲', 'North America'),
    ('Dominican Republic', 'DO', '🇩🇴', 'North America'),
    ('Puerto Rico', 'PR', '🇵🇷', 'North America'),
    ('Bahamas', 'BS', '🇧🇸', 'North America'),
    ('Belize', 'BZ', '🇧🇿', 'North America'),
    ('Honduras', 'HN', '🇭🇳', 'North America'),
    ('Nicaragua', 'NI', '🇳🇮', 'North America'),
    ('El Salvador', 'SV', '🇸🇻', 'North America'),

    -- South America
    ('Brazil', 'BR', '🇧🇷', 'South America'),
    ('Argentina', 'AR', '🇦🇷', 'South America'),
    ('Chile', 'CL', '🇨🇱', 'South America'),
    ('Peru', 'PE', '🇵🇪', 'South America'),
    ('Colombia', 'CO', '🇨🇴', 'South America'),
    ('Ecuador', 'EC', '🇪🇨', 'South America'),
    ('Bolivia', 'BO', '🇧🇴', 'South America'),
    ('Uruguay', 'UY', '🇺🇾', 'South America'),
    ('Paraguay', 'PY', '🇵🇾', 'South America'),
    ('Venezuela', 'VE', '🇻🇪', 'South America'),

    -- Africa
    ('South Africa', 'ZA', '🇿🇦', 'Africa'),
    ('Morocco', 'MA', '🇲🇦', 'Africa'),
    ('Egypt', 'EG', '🇪🇬', 'Africa'),
    ('Kenya', 'KE', '🇰🇪', 'Africa'),
    ('Tanzania', 'TZ', '🇹🇿', 'Africa'),
    ('Nigeria', 'NG', '🇳🇬', 'Africa'),
    ('Ghana', 'GH', '🇬🇭', 'Africa'),
    ('Ethiopia', 'ET', '🇪🇹', 'Africa'),
    ('Rwanda', 'RW', '🇷🇼', 'Africa'),
    ('Uganda', 'UG', '🇺🇬', 'Africa'),
    ('Senegal', 'SN', '🇸🇳', 'Africa'),
    ('Tunisia', 'TN', '🇹🇳', 'Africa'),
    ('Botswana', 'BW', '🇧🇼', 'Africa'),
    ('Namibia', 'NA', '🇳🇦', 'Africa'),
    ('Zimbabwe', 'ZW', '🇿🇼', 'Africa'),
    ('Mauritius', 'MU', '🇲🇺', 'Africa'),
    ('Madagascar', 'MG', '🇲🇬', 'Africa'),
    ('Zambia', 'ZM', '🇿🇲', 'Africa'),

    -- Oceania
    ('Australia', 'AU', '🇦🇺', 'Oceania'),
    ('New Zealand', 'NZ', '🇳🇿', 'Oceania'),
    ('Fiji', 'FJ', '🇫🇯', 'Oceania'),
    ('Papua New Guinea', 'PG', '🇵🇬', 'Oceania'),
    ('Samoa', 'WS', '🇼🇸', 'Oceania'),
    ('Tonga', 'TO', '🇹🇴', 'Oceania'),
    ('Vanuatu', 'VU', '🇻🇺', 'Oceania'),
    ('Solomon Islands', 'SB', '🇸🇧', 'Oceania'),
    ('French Polynesia', 'PF', '🇵🇫', 'Oceania'),
    ('New Caledonia', 'NC', '🇳🇨', 'Oceania')
) AS v(name, code, flag_emoji, continent_name);

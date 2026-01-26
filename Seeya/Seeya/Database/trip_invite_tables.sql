-- Trip Invite System Database Migration
-- Run this migration to add support for location/tripbit-level invitations and shareable invite links

-- =============================================================================
-- 1. CREATE trip_invite_links TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    code VARCHAR(10) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ,
    location_ids UUID[],
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick code lookups
CREATE INDEX IF NOT EXISTS idx_trip_invite_links_code ON trip_invite_links(code);

-- Index for fetching links by trip
CREATE INDEX IF NOT EXISTS idx_trip_invite_links_trip_id ON trip_invite_links(trip_id);

-- =============================================================================
-- 2. CREATE trip_participant_locations TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_participant_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES trip_participants(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES trip_locations(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'invited',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_id, location_id)
);

-- Index for fetching locations by participant
CREATE INDEX IF NOT EXISTS idx_trip_participant_locations_participant_id ON trip_participant_locations(participant_id);

-- Index for fetching participants by location
CREATE INDEX IF NOT EXISTS idx_trip_participant_locations_location_id ON trip_participant_locations(location_id);

-- =============================================================================
-- 3. CREATE trip_participant_tripbits TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_participant_tripbits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES trip_participants(id) ON DELETE CASCADE,
    tripbit_id UUID NOT NULL REFERENCES trip_bits(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'invited',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_id, tripbit_id)
);

-- Index for fetching tripbits by participant
CREATE INDEX IF NOT EXISTS idx_trip_participant_tripbits_participant_id ON trip_participant_tripbits(participant_id);

-- Index for fetching participants by tripbit
CREATE INDEX IF NOT EXISTS idx_trip_participant_tripbits_tripbit_id ON trip_participant_tripbits(tripbit_id);

-- =============================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE trip_invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participant_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participant_tripbits ENABLE ROW LEVEL SECURITY;

-- trip_invite_links policies
CREATE POLICY "Trip owners can manage invite links"
    ON trip_invite_links
    FOR ALL
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM trips WHERE trips.id = trip_invite_links.trip_id AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can read valid invite links by code"
    ON trip_invite_links
    FOR SELECT
    USING (
        (expires_at IS NULL OR expires_at > NOW())
    );

-- trip_participant_locations policies
CREATE POLICY "Participants can view their own location participation"
    ON trip_participant_locations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trip_participants tp
            WHERE tp.id = trip_participant_locations.participant_id
            AND tp.user_id = auth.uid()
        )
    );

CREATE POLICY "Trip owners can manage participant locations"
    ON trip_participant_locations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM trip_participants tp
            JOIN trips t ON t.id = tp.trip_id
            WHERE tp.id = trip_participant_locations.participant_id
            AND t.user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can update their own location status"
    ON trip_participant_locations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM trip_participants tp
            WHERE tp.id = trip_participant_locations.participant_id
            AND tp.user_id = auth.uid()
        )
    );

-- trip_participant_tripbits policies
CREATE POLICY "Participants can view their own tripbit participation"
    ON trip_participant_tripbits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trip_participants tp
            WHERE tp.id = trip_participant_tripbits.participant_id
            AND tp.user_id = auth.uid()
        )
    );

CREATE POLICY "Trip owners can manage participant tripbits"
    ON trip_participant_tripbits
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM trip_participants tp
            JOIN trips t ON t.id = tp.trip_id
            WHERE tp.id = trip_participant_tripbits.participant_id
            AND t.user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can update their own tripbit status"
    ON trip_participant_tripbits
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM trip_participants tp
            WHERE tp.id = trip_participant_tripbits.participant_id
            AND tp.user_id = auth.uid()
        )
    );

-- =============================================================================
-- 5. HELPER FUNCTION: Increment invite link usage
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_invite_link_usage(link_code VARCHAR)
RETURNS void AS $$
BEGIN
    UPDATE trip_invite_links
    SET usage_count = usage_count + 1
    WHERE code = link_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. HELPER FUNCTION: Validate and get invite link
-- =============================================================================

CREATE OR REPLACE FUNCTION get_valid_invite_link(link_code VARCHAR)
RETURNS TABLE (
    id UUID,
    trip_id UUID,
    created_by UUID,
    code VARCHAR,
    expires_at TIMESTAMPTZ,
    location_ids UUID[],
    usage_count INT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        til.id,
        til.trip_id,
        til.created_by,
        til.code,
        til.expires_at,
        til.location_ids,
        til.usage_count,
        til.created_at
    FROM trip_invite_links til
    WHERE til.code = link_code
    AND (til.expires_at IS NULL OR til.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

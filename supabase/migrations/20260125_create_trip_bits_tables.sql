-- TripPack/TripBits Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. TRIP_BITS - Main table for itinerary items
-- ============================================
CREATE TABLE IF NOT EXISTS trip_bits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    category TEXT NOT NULL CHECK (category IN ('flight', 'stay', 'car', 'activity', 'transport', 'money', 'reservation', 'document', 'photos', 'other')),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
    start_datetime TIMESTAMPTZ,
    end_datetime TIMESTAMPTZ,
    location_id UUID REFERENCES trip_locations(id) ON DELETE SET NULL,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by trip
CREATE INDEX IF NOT EXISTS idx_trip_bits_trip_id ON trip_bits(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_bits_category ON trip_bits(category);
CREATE INDEX IF NOT EXISTS idx_trip_bits_start_datetime ON trip_bits(start_datetime);

-- ============================================
-- 2. TRIP_BIT_DETAILS - Category-specific fields (JSONB)
-- ============================================
CREATE TABLE IF NOT EXISTS trip_bit_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_bit_id UUID NOT NULL REFERENCES trip_bits(id) ON DELETE CASCADE,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_bit_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trip_bit_details_trip_bit_id ON trip_bit_details(trip_bit_id);

-- ============================================
-- 3. TRIP_BIT_TRAVELERS - Who each TripBit applies to
-- ============================================
CREATE TABLE IF NOT EXISTS trip_bit_travelers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_bit_id UUID NOT NULL REFERENCES trip_bits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    applies_to_all BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_bit_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trip_bit_travelers_trip_bit_id ON trip_bit_travelers(trip_bit_id);
CREATE INDEX IF NOT EXISTS idx_trip_bit_travelers_user_id ON trip_bit_travelers(user_id);

-- ============================================
-- 4. TRIP_BIT_ATTACHMENTS - Documents, photos, confirmations
-- ============================================
CREATE TABLE IF NOT EXISTS trip_bit_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_bit_id UUID NOT NULL REFERENCES trip_bits(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trip_bit_attachments_trip_bit_id ON trip_bit_attachments(trip_bit_id);

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_trip_bits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trip_bits_updated_at ON trip_bits;
CREATE TRIGGER trigger_trip_bits_updated_at
    BEFORE UPDATE ON trip_bits
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_bits_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE trip_bits ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_bit_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_bit_travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_bit_attachments ENABLE ROW LEVEL SECURITY;

-- TRIP_BITS policies
-- Users can view trip_bits if they own the trip or are a confirmed participant
CREATE POLICY "Users can view trip_bits for their trips"
    ON trip_bits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = trip_bits.trip_id
            AND trips.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM trip_participants
            WHERE trip_participants.trip_id = trip_bits.trip_id
            AND trip_participants.user_id = auth.uid()
            AND trip_participants.status = 'confirmed'
        )
    );

-- Users can insert trip_bits if they own the trip or are a confirmed participant
CREATE POLICY "Users can create trip_bits for their trips"
    ON trip_bits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = trip_bits.trip_id
            AND trips.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM trip_participants
            WHERE trip_participants.trip_id = trip_bits.trip_id
            AND trip_participants.user_id = auth.uid()
            AND trip_participants.status = 'confirmed'
        )
    );

-- Users can update trip_bits they created or if they own the trip
CREATE POLICY "Users can update their own trip_bits"
    ON trip_bits FOR UPDATE
    USING (
        created_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = trip_bits.trip_id
            AND trips.user_id = auth.uid()
        )
    );

-- Users can delete trip_bits they created or if they own the trip
CREATE POLICY "Users can delete their own trip_bits"
    ON trip_bits FOR DELETE
    USING (
        created_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = trip_bits.trip_id
            AND trips.user_id = auth.uid()
        )
    );

-- TRIP_BIT_DETAILS policies (follow parent trip_bit access)
CREATE POLICY "Users can view trip_bit_details"
    ON trip_bit_details FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trip_bits
            WHERE trip_bits.id = trip_bit_details.trip_bit_id
            AND (
                EXISTS (
                    SELECT 1 FROM trips
                    WHERE trips.id = trip_bits.trip_id
                    AND trips.user_id = auth.uid()
                )
                OR
                EXISTS (
                    SELECT 1 FROM trip_participants
                    WHERE trip_participants.trip_id = trip_bits.trip_id
                    AND trip_participants.user_id = auth.uid()
                    AND trip_participants.status = 'confirmed'
                )
            )
        )
    );

CREATE POLICY "Users can manage trip_bit_details"
    ON trip_bit_details FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM trip_bits
            WHERE trip_bits.id = trip_bit_details.trip_bit_id
            AND (
                trip_bits.created_by = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM trips
                    WHERE trips.id = trip_bits.trip_id
                    AND trips.user_id = auth.uid()
                )
            )
        )
    );

-- TRIP_BIT_TRAVELERS policies
CREATE POLICY "Users can view trip_bit_travelers"
    ON trip_bit_travelers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trip_bits
            WHERE trip_bits.id = trip_bit_travelers.trip_bit_id
            AND (
                EXISTS (
                    SELECT 1 FROM trips
                    WHERE trips.id = trip_bits.trip_id
                    AND trips.user_id = auth.uid()
                )
                OR
                EXISTS (
                    SELECT 1 FROM trip_participants
                    WHERE trip_participants.trip_id = trip_bits.trip_id
                    AND trip_participants.user_id = auth.uid()
                    AND trip_participants.status = 'confirmed'
                )
            )
        )
    );

CREATE POLICY "Users can manage trip_bit_travelers"
    ON trip_bit_travelers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM trip_bits
            WHERE trip_bits.id = trip_bit_travelers.trip_bit_id
            AND (
                trip_bits.created_by = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM trips
                    WHERE trips.id = trip_bits.trip_id
                    AND trips.user_id = auth.uid()
                )
            )
        )
    );

-- TRIP_BIT_ATTACHMENTS policies
CREATE POLICY "Users can view trip_bit_attachments"
    ON trip_bit_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trip_bits
            WHERE trip_bits.id = trip_bit_attachments.trip_bit_id
            AND (
                EXISTS (
                    SELECT 1 FROM trips
                    WHERE trips.id = trip_bits.trip_id
                    AND trips.user_id = auth.uid()
                )
                OR
                EXISTS (
                    SELECT 1 FROM trip_participants
                    WHERE trip_participants.trip_id = trip_bits.trip_id
                    AND trip_participants.user_id = auth.uid()
                    AND trip_participants.status = 'confirmed'
                )
            )
        )
    );

CREATE POLICY "Users can manage trip_bit_attachments"
    ON trip_bit_attachments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM trip_bits
            WHERE trip_bits.id = trip_bit_attachments.trip_bit_id
            AND (
                trip_bits.created_by = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM trips
                    WHERE trips.id = trip_bits.trip_id
                    AND trips.user_id = auth.uid()
                )
            )
        )
    );

-- ============================================
-- Done! Tables created with RLS policies
-- ============================================

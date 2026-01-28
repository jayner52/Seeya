import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { TripWithDetails } from '@/types';
import { transformLocation, transformParticipant } from '@/types/database';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { code } = await params;
  const supabase = await createClient();

  try {
    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from('trip_invite_links')
      .select('id, trip_id, code, expires_at, location_ids, usage_count, created_at')
      .eq('code', code)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invite not found', valid: false },
        { status: 404 }
      );
    }

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired', valid: false, expired: true },
        { status: 410 }
      );
    }

    // Get trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, name, description, start_date, end_date, user_id, created_at, updated_at')
      .eq('id', invite.trip_id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { error: 'Trip not found', valid: false },
        { status: 404 }
      );
    }

    // Get locations
    const { data: locations } = await supabase
      .from('trip_locations')
      .select(`
        id, trip_id, city_id, name, arrival_date, departure_date, order_index, created_at,
        city:cities (id, name, country, country_code, continent)
      `)
      .eq('trip_id', trip.id)
      .order('order_index');

    // Get participants
    const { data: participants } = await supabase
      .from('trip_participants')
      .select(`
        id, trip_id, user_id, role, status, joined_at, created_at,
        user:profiles (id, full_name, avatar_url)
      `)
      .eq('trip_id', trip.id)
      .eq('status', 'accepted');

    const tripWithDetails: TripWithDetails = {
      ...trip,
      locations: (locations || []).map(transformLocation),
      participants: (participants || []).map(transformParticipant),
    };

    return NextResponse.json({
      valid: true,
      invite,
      trip: tripWithDetails,
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    return NextResponse.json(
      { error: 'Internal server error', valid: false },
      { status: 500 }
    );
  }
}

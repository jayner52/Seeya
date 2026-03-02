import { createClient } from '@/lib/supabase/client';
import type { InviteValidationResult, TripWithDetails } from '@/types';
import { transformLocation, transformParticipant } from '@/types/database';

export async function validateInviteCode(
  code: string
): Promise<InviteValidationResult> {
  const supabase = createClient();

  try {
    // Get invite with full trip details
    const { data: invite, error } = await supabase
      .from('trip_invite_links')
      .select(
        `
        id,
        trip_id,
        created_by,
        code,
        expires_at,
        location_ids,
        usage_count,
        created_at
      `
      )
      .eq('code', code)
      .single();

    if (error || !invite) {
      return { valid: false, error: 'Invite not found' };
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { valid: false, error: 'Invite has expired', expired: true };
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(
        `
        id,
        name,
        description,
        start_date,
        end_date,
        user_id,
        created_at,
        updated_at
      `
      )
      .eq('id', invite.trip_id)
      .single();

    if (tripError || !trip) {
      return { valid: false, error: 'Trip not found' };
    }

    // Get locations
    const { data: locations } = await supabase
      .from('trip_locations')
      .select(
        `
        id,
        trip_id,
        city_id,
        name,
        order_index,
        created_at,
        city:cities (
          id,
          name,
          country,
          country_code,
          continent
        )
      `
      )
      .eq('trip_id', trip.id)
      .order('order_index');

    // Get participants with profile info
    const { data: participants } = await supabase
      .from('trip_participants')
      .select(
        `
        id,
        trip_id,
        user_id,
        role,
        status,
        created_at,
        user:profiles (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq('trip_id', trip.id)
      .eq('status', 'confirmed');

    const tripWithDetails: TripWithDetails = {
      ...trip,
      locations: (locations || []).map(transformLocation),
      participants: (participants || []).map(transformParticipant),
    };

    return {
      valid: true,
      invite,
      trip: tripWithDetails,
    };
  } catch (err) {
    console.error('Error validating invite:', err);
    return { valid: false, error: 'Failed to validate invite' };
  }
}

export async function acceptInvite(
  code: string,
  _userId: string  // kept for API compat; server infers user from session cookie
): Promise<{ success: boolean; tripId?: string; isNewUser?: boolean; error?: string }> {
  try {
    const res = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to join trip' };
    }

    return { success: true, tripId: data.tripId, isNewUser: data.isNewUser };
  } catch {
    return { success: false, error: 'Failed to accept invite' };
  }
}

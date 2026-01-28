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
        arrival_date,
        departure_date,
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
        joined_at,
        created_at,
        user:profiles (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq('trip_id', trip.id)
      .eq('status', 'accepted');

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
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Get the invite
    const { data: invite, error: inviteError } = await supabase
      .from('trip_invite_links')
      .select('id, trip_id, location_ids, usage_count')
      .eq('code', code)
      .single();

    if (inviteError || !invite) {
      return { success: false, error: 'Invite not found' };
    }

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from('trip_participants')
      .select('id, status')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', userId)
      .single();

    if (existingParticipant) {
      if (existingParticipant.status === 'accepted') {
        return { success: true }; // Already a member
      }
      // Update existing participant to accepted
      const { error: updateError } = await supabase
        .from('trip_participants')
        .update({ status: 'accepted', joined_at: new Date().toISOString() })
        .eq('id', existingParticipant.id);

      if (updateError) {
        return { success: false, error: 'Failed to accept invite' };
      }
    } else {
      // Create new participant
      const { error: insertError } = await supabase
        .from('trip_participants')
        .insert({
          trip_id: invite.trip_id,
          user_id: userId,
          role: 'member',
          status: 'accepted',
          joined_at: new Date().toISOString(),
        });

      if (insertError) {
        return { success: false, error: 'Failed to join trip' };
      }
    }

    // Increment usage count
    await supabase
      .from('trip_invite_links')
      .update({ usage_count: invite.usage_count + 1 })
      .eq('id', invite.id);

    return { success: true };
  } catch (err) {
    console.error('Error accepting invite:', err);
    return { success: false, error: 'Failed to accept invite' };
  }
}

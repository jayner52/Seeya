import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', success: false },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required', success: false },
        { status: 400 }
      );
    }

    // Get invite (admin client so RLS doesn't block reading the link)
    const { data: invite, error: inviteError } = await adminSupabase
      .from('trip_invite_links')
      .select('id, trip_id, location_ids, usage_count, expires_at')
      .eq('code', code)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invite not found', success: false },
        { status: 404 }
      );
    }

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired', success: false },
        { status: 410 }
      );
    }

    // Check if user is already a confirmed participant
    const { data: existingParticipant } = await adminSupabase
      .from('trip_participants')
      .select('id, status')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      if (existingParticipant.status === 'confirmed') {
        return NextResponse.json({
          success: true,
          message: 'Already a member of this trip',
          tripId: invite.trip_id,
        });
      }

      // Update existing participant record to confirmed
      const { error: updateError } = await adminSupabase
        .from('trip_participants')
        .update({ status: 'confirmed' })
        .eq('id', existingParticipant.id);

      if (updateError) {
        console.error('Error updating participant:', updateError);
        return NextResponse.json(
          { error: 'Failed to accept invite', success: false },
          { status: 500 }
        );
      }
    } else {
      // Insert new participant — uses admin client to bypass RLS
      const { error: insertError } = await adminSupabase
        .from('trip_participants')
        .insert({
          trip_id: invite.trip_id,
          user_id: user.id,
          role: 'member',
          status: 'confirmed',
        });

      if (insertError) {
        console.error('Error inserting participant:', insertError);
        return NextResponse.json(
          { error: 'Failed to join trip', success: false },
          { status: 500 }
        );
      }
    }

    // Increment usage count
    await adminSupabase
      .from('trip_invite_links')
      .update({ usage_count: invite.usage_count + 1 })
      .eq('id', invite.id);

    return NextResponse.json({
      success: true,
      message: 'Successfully joined trip',
      tripId: invite.trip_id,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

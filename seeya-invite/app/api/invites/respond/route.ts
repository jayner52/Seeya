import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type InviteResponse = 'accept' | 'maybe' | 'decline';

const STATUS_MAP: Record<InviteResponse, string> = {
  accept: 'confirmed',
  maybe: 'maybe',
  decline: 'declined',
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
  }

  await supabase.rpc('ensure_profile_exists');

  try {
    const body = await request.json();
    const { code, response }: { code: string; response: InviteResponse } = body;

    if (!code || !response || !STATUS_MAP[response]) {
      return NextResponse.json(
        { error: 'code and response (accept|maybe|decline) are required', success: false },
        { status: 400 }
      );
    }

    // Validate invite
    const { data: invite, error: inviteError } = await supabase
      .from('trip_invite_links')
      .select('id, trip_id, usage_count, expires_at')
      .eq('code', code)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found', success: false }, { status: 404 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired', success: false }, { status: 410 });
    }

    const newStatus = STATUS_MAP[response];

    // Check for existing participant record
    const { data: existing } = await supabase
      .from('trip_participants')
      .select('id, status')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      if (existing.status === newStatus) {
        // Already at this status — treat as success
        return NextResponse.json({
          success: true,
          tripId: invite.trip_id,
          declined: response === 'decline',
        });
      }
      await supabase
        .from('trip_participants')
        .update({ status: newStatus })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('trip_participants')
        .insert({ trip_id: invite.trip_id, user_id: user.id, status: newStatus });
    }

    // Increment usage count on accept/maybe
    if (response !== 'decline') {
      await supabase
        .from('trip_invite_links')
        .update({ usage_count: (invite.usage_count ?? 0) + 1 })
        .eq('id', invite.id);
    }

    // For decline, no further checks needed
    if (response === 'decline') {
      return NextResponse.json({ success: true, tripId: invite.trip_id, declined: true });
    }

    // For accept/maybe, check if new user needs onboarding
    const { data: prof } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      tripId: invite.trip_id,
      isNewUser: prof?.onboarding_completed === false,
    });
  } catch (error) {
    console.error('Error responding to invite:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

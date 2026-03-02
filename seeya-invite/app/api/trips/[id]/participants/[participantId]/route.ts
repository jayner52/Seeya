import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string; participantId: string }> };

// PATCH — change a participant's status
export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: tripId, participantId } = await params;
  const { status } = await request.json();
  const allowed = ['confirmed', 'maybe', 'invited'];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // SECURITY DEFINER RPC verifies ownership and bypasses RLS
  const { error } = await supabase.rpc('update_trip_participant_status', {
    p_trip_id: tripId,
    p_participant_id: participantId,
    p_status: status,
  });

  if (error) {
    const status403 = error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status: status403 });
  }
  return NextResponse.json({ success: true });
}

// DELETE — remove a participant
export async function DELETE(_request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: tripId, participantId } = await params;

  // SECURITY DEFINER RPC verifies ownership and bypasses RLS
  const { error } = await supabase.rpc('remove_trip_participant', {
    p_trip_id: tripId,
    p_participant_id: participantId,
  });

  if (error) {
    const statusCode = error.message === 'Forbidden' ? 403
      : error.message === 'Cannot remove the trip owner' ? 400
      : 500;
    return NextResponse.json({ error: error.message }, { status: statusCode });
  }
  return NextResponse.json({ success: true });
}

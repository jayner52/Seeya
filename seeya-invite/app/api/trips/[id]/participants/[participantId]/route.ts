import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string; participantId: string }> };

// PATCH — change a participant's status
export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: tripId, participantId } = await params;

  // Verify requester is trip owner
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status } = await request.json();
  const allowed = ['confirmed', 'maybe', 'invited'];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('trip_participants')
    .update({ status })
    .eq('id', participantId)
    .eq('trip_id', tripId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE — remove a participant
export async function DELETE(_request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: tripId, participantId } = await params;

  // Verify requester is trip owner
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent owner from removing themselves
  const { data: participant } = await supabase
    .from('trip_participants')
    .select('user_id')
    .eq('id', participantId)
    .eq('trip_id', tripId)
    .single();

  if (participant?.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot remove the trip owner' }, { status: 400 });
  }

  const { error } = await supabase
    .from('trip_participants')
    .delete()
    .eq('id', participantId)
    .eq('trip_id', tripId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

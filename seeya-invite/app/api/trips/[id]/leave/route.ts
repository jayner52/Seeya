import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase.rpc('leave_trip', { p_trip_id: tripId });

  if (error) {
    const isOwner = error.message?.includes('owner');
    return NextResponse.json(
      { error: error.message },
      { status: isOwner ? 400 : 500 }
    );
  }

  return NextResponse.json({ success: true });
}

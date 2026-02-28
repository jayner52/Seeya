import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: itineraries, error } = await supabase
    .from('itineraries')
    .select(`
      id, title, description, destination, duration_days, share_code, view_count, created_by
    `)
    .eq('is_featured', true)
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(6);

  if (error) {
    console.error('Error fetching featured itineraries:', error);
    return NextResponse.json({ error: 'Failed to fetch featured itineraries' }, { status: 500 });
  }

  if (!itineraries || itineraries.length === 0) {
    return NextResponse.json({ itineraries: [] });
  }

  // Get creator profiles
  const creatorIds = Array.from(new Set(itineraries.map((i) => i.created_by)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', creatorIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const enriched = itineraries.map((itin) => ({
    ...itin,
    creator: profileMap.get(itin.created_by) || null,
  }));

  return NextResponse.json({ itineraries: enriched });
}

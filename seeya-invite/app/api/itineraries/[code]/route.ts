import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: itinerary, error } = await supabase
    .from('itineraries')
    .select(`
      id, title, description, destination, duration_days, share_code,
      view_count, created_at, created_by,
      itinerary_items (
        id, day_number, order_index, category, title, notes, start_time, location_name
      )
    `)
    .eq('share_code', code)
    .eq('is_published', true)
    .single();

  if (error || !itinerary) {
    return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
  }

  // Get creator profile
  const { data: creator } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', itinerary.created_by)
    .single();

  // Increment view count (fire and forget)
  supabase
    .from('itineraries')
    .update({ view_count: itinerary.view_count + 1 })
    .eq('id', itinerary.id)
    .then(() => {});

  // Sort items by day_number then order_index
  const sortedItems = [...(itinerary.itinerary_items || [])].sort((a, b) => {
    const dayA = a.day_number ?? 999;
    const dayB = b.day_number ?? 999;
    if (dayA !== dayB) return dayA - dayB;
    return (a.order_index ?? 0) - (b.order_index ?? 0);
  });

  return NextResponse.json({
    ...itinerary,
    itinerary_items: sortedItems,
    creator: creator || null,
  });
}

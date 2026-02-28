import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { trip_id, title, description, destination, duration_days, items } = body;

    if (!title || !destination) {
      return NextResponse.json({ error: 'title and destination are required' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 });
    }

    // Insert itinerary
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .insert({
        created_by: user.id,
        trip_id: trip_id || null,
        title,
        description: description || null,
        destination,
        duration_days: duration_days || null,
        is_published: true,
      })
      .select('id, share_code')
      .single();

    if (itineraryError || !itinerary) {
      console.error('Error creating itinerary:', itineraryError);
      return NextResponse.json({ error: 'Failed to create itinerary' }, { status: 500 });
    }

    // Insert items
    const itemRows = items.map((item: {
      day_number?: number;
      order_index?: number;
      category: string;
      title: string;
      notes?: string;
      start_time?: string;
      location_name?: string;
    }, index: number) => ({
      itinerary_id: itinerary.id,
      day_number: item.day_number ?? null,
      order_index: item.order_index ?? index,
      category: item.category,
      title: item.title,
      notes: item.notes ?? null,
      start_time: item.start_time ?? null,
      location_name: item.location_name ?? null,
    }));

    const { error: itemsError } = await supabase
      .from('itinerary_items')
      .insert(itemRows);

    if (itemsError) {
      console.error('Error inserting itinerary items:', itemsError);
      // Clean up the itinerary if items failed
      await supabase.from('itineraries').delete().eq('id', itinerary.id);
      return NextResponse.json({ error: 'Failed to save itinerary items' }, { status: 500 });
    }

    return NextResponse.json({ id: itinerary.id, share_code: itinerary.share_code }, { status: 201 });
  } catch (error) {
    console.error('Error creating itinerary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

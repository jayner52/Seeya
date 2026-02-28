import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { mode, trip_id, new_trip_name } = body;

    if (!mode || !['new_trip', 'existing_trip'].includes(mode)) {
      return NextResponse.json({ error: 'mode must be new_trip or existing_trip' }, { status: 400 });
    }

    // Fetch itinerary + items
    const { data: itinerary, error: itinError } = await supabase
      .from('itineraries')
      .select(`
        id, title, destination, duration_days,
        itinerary_items (
          day_number, order_index, category, title, notes, start_time, location_name
        )
      `)
      .eq('share_code', code)
      .eq('is_published', true)
      .single();

    if (itinError || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
    }

    let targetTripId: string;

    if (mode === 'new_trip') {
      const tripName = new_trip_name || itinerary.title;
      const { data: newTrip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          name: tripName,
          description: `Copied from itinerary: ${itinerary.title}`,
          is_flexible: true,
          visibility: 'private',
        })
        .select('id')
        .single();

      if (tripError || !newTrip) {
        console.error('Error creating trip:', tripError);
        return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
      }

      // Add the destination as a trip location
      await supabase
        .from('trip_locations')
        .insert({
          trip_id: newTrip.id,
          custom_location: itinerary.destination,
          order_index: 0,
        });

      targetTripId = newTrip.id;
    } else {
      if (!trip_id) {
        return NextResponse.json({ error: 'trip_id is required for existing_trip mode' }, { status: 400 });
      }

      // Verify user owns/is participant of the trip
      const { data: tripCheck } = await supabase
        .from('trips')
        .select('id')
        .eq('id', trip_id)
        .eq('user_id', user.id)
        .single();

      if (!tripCheck) {
        return NextResponse.json({ error: 'Trip not found or access denied' }, { status: 403 });
      }

      targetTripId = trip_id;
    }

    // Get current trip bit count for ordering
    const { count: existingCount } = await supabase
      .from('trip_bits')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', targetTripId);

    const startIndex = existingCount ?? 0;

    // Insert trip bits from itinerary items
    const items = itinerary.itinerary_items || [];
    if (items.length > 0) {
      const tripBits = items.map((item: {
        category: string;
        title: string;
        notes?: string | null;
        order_index: number;
      }, index: number) => ({
        trip_id: targetTripId,
        created_by: user.id,
        category: item.category,
        title: item.title,
        notes: item.notes ?? null,
        status: 'idea',
        order_index: startIndex + index,
      }));

      const { error: bitsError } = await supabase
        .from('trip_bits')
        .insert(tripBits);

      if (bitsError) {
        console.error('Error inserting trip bits:', bitsError);
        return NextResponse.json({ error: 'Failed to copy itinerary items' }, { status: 500 });
      }
    }

    return NextResponse.json({ trip_id: targetTripId });
  } catch (error) {
    console.error('Error copying itinerary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

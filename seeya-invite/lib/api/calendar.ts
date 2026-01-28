import { createClient } from '@/lib/supabase/client';
import type {
  CalendarTrip,
  TravelPal,
  UpcomingTrip,
  TripRole,
  VisibilityLevel,
} from '@/types/calendar';
import { getPalColor, LEGEND_COLORS } from '@/types/calendar';

// Helper to get city name from Supabase nested relation (can be array or object)
function getCityName(city: unknown): string | undefined {
  if (!city) return undefined;
  if (Array.isArray(city)) {
    return city[0]?.name;
  }
  return (city as { name?: string })?.name;
}

// Fetch user's trips (owned + participating)
export async function fetchUserTrips(userId: string): Promise<CalendarTrip[]> {
  const supabase = createClient();

  // Get trips where user is owner
  const { data: ownedTrips } = await supabase
    .from('trips')
    .select(`
      id,
      name,
      start_date,
      end_date,
      user_id,
      trip_locations (
        name,
        order_index,
        city:cities (name, country)
      )
    `)
    .eq('user_id', userId)
    .not('start_date', 'is', null);

  // Get trips where user is participant
  const { data: participations } = await supabase
    .from('trip_participants')
    .select(`
      trip_id,
      status,
      trip:trips (
        id,
        name,
        start_date,
        end_date,
        user_id,
        owner:profiles!trips_user_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        trip_locations (
          name,
          order_index,
          city:cities (name, country)
        )
      )
    `)
    .eq('user_id', userId)
    .neq('trip_id', null);

  // Get user profile for owned trips
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', userId)
    .single();

  const trips: CalendarTrip[] = [];

  // Process owned trips
  if (ownedTrips) {
    for (const trip of ownedTrips) {
      if (!trip.start_date || !trip.end_date) continue;

      const locations = trip.trip_locations || [];
      const firstLocation = locations.sort((a: any, b: any) => a.order_index - b.order_index)[0];
      const destination = firstLocation
        ? (getCityName(firstLocation.city) || firstLocation.name)
        : undefined;

      trips.push({
        id: trip.id,
        name: trip.name,
        start_date: trip.start_date,
        end_date: trip.end_date,
        visibility: 'full_details' as VisibilityLevel,
        owner: {
          id: userId,
          full_name: userProfile?.full_name || 'You',
          avatar_url: userProfile?.avatar_url || null,
        },
        role: 'owner',
        color: LEGEND_COLORS.your_trips,
        destination,
      });
    }
  }

  // Process participating trips
  if (participations) {
    for (const p of participations) {
      const trip = p.trip as any;
      if (!trip || !trip.start_date || !trip.end_date) continue;
      // Skip if user is owner (already added above)
      if (trip.user_id === userId) continue;

      const locations = trip.trip_locations || [];
      const firstLocation = locations.sort((a: any, b: any) => a.order_index - b.order_index)[0];
      const destination = firstLocation
        ? (getCityName(firstLocation.city) || firstLocation.name)
        : undefined;

      const owner = Array.isArray(trip.owner) ? trip.owner[0] : trip.owner;
      const role: TripRole = p.status === 'accepted' ? 'accepted' : 'invited';

      trips.push({
        id: trip.id,
        name: trip.name,
        start_date: trip.start_date,
        end_date: trip.end_date,
        visibility: 'full_details' as VisibilityLevel,
        owner: {
          id: owner?.id || trip.user_id,
          full_name: owner?.full_name || 'Unknown',
          avatar_url: owner?.avatar_url || null,
        },
        role,
        color: role === 'accepted' ? LEGEND_COLORS.accepted : LEGEND_COLORS.invited,
        destination,
      });
    }
  }

  return trips;
}

// Fetch travel pals (accepted friendships)
export async function fetchTravelPals(userId: string): Promise<TravelPal[]> {
  const supabase = createClient();

  // Get friendships where status is accepted
  const { data: friendships } = await supabase
    .from('friendships')
    .select(`
      requester_id,
      addressee_id,
      requester:profiles!friendships_requester_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      addressee:profiles!friendships_addressee_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (!friendships) return [];

  const pals: TravelPal[] = [];

  for (let i = 0; i < friendships.length; i++) {
    const f = friendships[i];
    const friend = f.requester_id === userId
      ? (Array.isArray(f.addressee) ? f.addressee[0] : f.addressee)
      : (Array.isArray(f.requester) ? f.requester[0] : f.requester);

    if (!friend) continue;

    // Get trip count for this pal
    const { count } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', friend.id)
      .not('start_date', 'is', null);

    pals.push({
      id: friend.id,
      full_name: friend.full_name,
      avatar_url: friend.avatar_url,
      trip_count: count || 0,
      color: getPalColor(i + 1), // +1 to skip yellow (user's color)
    });
  }

  return pals;
}

// Fetch travel pals' visible trips (respecting visibility settings)
export async function fetchPalTrips(
  userId: string,
  palIds: string[]
): Promise<CalendarTrip[]> {
  if (palIds.length === 0) return [];

  const supabase = createClient();

  const { data: trips } = await supabase
    .from('trips')
    .select(`
      id,
      name,
      start_date,
      end_date,
      user_id,
      visibility,
      owner:profiles!trips_user_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      trip_locations (
        name,
        order_index,
        city:cities (name, country)
      )
    `)
    .in('user_id', palIds)
    .not('start_date', 'is', null);

  if (!trips) return [];

  // Get pal colors map
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const palColorMap = new Map<string, string>();
  if (friendships) {
    friendships.forEach((f, i) => {
      const palId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      palColorMap.set(palId, getPalColor(i + 1));
    });
  }

  const calendarTrips: CalendarTrip[] = [];

  for (const trip of trips) {
    if (!trip.start_date || !trip.end_date) continue;

    // Respect visibility settings
    const visibility = (trip.visibility as VisibilityLevel) || 'full_details';
    if (visibility === 'only_me') continue;

    const owner = Array.isArray(trip.owner) ? trip.owner[0] : trip.owner;
    const locations = trip.trip_locations || [];
    const firstLocation = locations.sort((a: any, b: any) => a.order_index - b.order_index)[0];
    const destination = firstLocation
      ? (getCityName(firstLocation.city) || firstLocation.name)
      : undefined;

    calendarTrips.push({
      id: trip.id,
      name: visibility === 'busy_only' ? 'Busy' : trip.name,
      start_date: trip.start_date,
      end_date: trip.end_date,
      visibility,
      owner: {
        id: owner?.id || trip.user_id,
        full_name: owner?.full_name || 'Unknown',
        avatar_url: owner?.avatar_url || null,
      },
      role: 'viewing',
      color: palColorMap.get(trip.user_id) || LEGEND_COLORS.viewing,
      destination: visibility === 'dates_only' ? undefined : destination,
    });
  }

  return calendarTrips;
}

// Fetch upcoming trips for sidebar
export async function fetchUpcomingTrips(userId: string): Promise<UpcomingTrip[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Get trip IDs where user is participant
  const { data: participations } = await supabase
    .from('trip_participants')
    .select('trip_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (!participations || participations.length === 0) return [];

  const tripIds = participations.map((p) => p.trip_id);

  const { data: trips } = await supabase
    .from('trips')
    .select(`
      id,
      name,
      start_date,
      trip_locations (
        name,
        order_index,
        city:cities (name, country)
      )
    `)
    .in('id', tripIds)
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(6);

  if (!trips) return [];

  return trips.map((trip) => {
    const locations = trip.trip_locations || [];
    const firstLocation = locations.sort((a: any, b: any) => a.order_index - b.order_index)[0];
    const destination = firstLocation
      ? (getCityName(firstLocation.city) || firstLocation.name)
      : undefined;

    const startDate = new Date(trip.start_date!);
    const now = new Date();
    const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: trip.id,
      name: trip.name,
      destination,
      start_date: trip.start_date!,
      days_until: daysUntil,
    };
  });
}

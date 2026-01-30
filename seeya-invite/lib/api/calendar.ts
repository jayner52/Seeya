import { createClient } from '@/lib/supabase/client';
import type {
  CalendarTrip,
  TravelPal,
  UpcomingTrip,
  TripRole,
  VisibilityLevel,
} from '@/types/calendar';
import { getPalColor, LEGEND_COLORS } from '@/types/calendar';

// Fetch user's trips (owned + participating) - simplified to match working Trips page
export async function fetchUserTrips(userId: string): Promise<CalendarTrip[]> {
  const supabase = createClient();

  // Step 1: Get trip IDs where user is participant
  const { data: participations } = await supabase
    .from('trip_participants')
    .select('trip_id, status')
    .eq('user_id', userId);

  const participantTripIds = participations?.map((p) => p.trip_id) || [];
  const participantStatusMap = new Map(
    participations?.map((p) => [p.trip_id, p.status]) || []
  );

  // Step 2: Get trip IDs where user is owner
  const { data: ownedTripData } = await supabase
    .from('trips')
    .select('id')
    .eq('user_id', userId)
    .not('start_date', 'is', null);

  const ownedTripIds = ownedTripData?.map((t) => t.id) || [];

  // Combine and deduplicate
  const allTripIds = Array.from(new Set([...participantTripIds, ...ownedTripIds]));

  console.log('[Calendar] Trip IDs - owned:', ownedTripIds.length, 'participant:', participantTripIds.length, 'total:', allTripIds.length);

  if (allTripIds.length === 0) {
    return [];
  }

  // Step 3: Get trip details (simple query like Trips page)
  const { data: tripsData, error: tripsError } = await supabase
    .from('trips')
    .select('id, name, start_date, end_date, user_id')
    .in('id', allTripIds)
    .not('start_date', 'is', null);

  console.log('[Calendar] Trips data:', { count: tripsData?.length, error: tripsError });

  if (!tripsData) {
    return [];
  }

  // Step 4: Get user profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', userId)
    .single();

  // Step 5: Build calendar trips
  const trips: CalendarTrip[] = [];

  for (const trip of tripsData) {
    if (!trip.start_date || !trip.end_date) continue;

    const isOwner = trip.user_id === userId;
    const participantStatus = participantStatusMap.get(trip.id);

    let role: TripRole;
    let color: string;

    if (isOwner) {
      role = 'owner';
      color = LEGEND_COLORS.your_trips;
    } else if (participantStatus === 'accepted') {
      role = 'accepted';
      color = LEGEND_COLORS.accepted;
    } else {
      role = 'invited';
      color = LEGEND_COLORS.invited;
    }

    trips.push({
      id: trip.id,
      name: trip.name,
      start_date: trip.start_date,
      end_date: trip.end_date,
      visibility: 'full_details' as VisibilityLevel,
      owner: {
        id: isOwner ? userId : trip.user_id,
        full_name: isOwner ? (userProfile?.full_name || 'You') : 'Trip Owner',
        avatar_url: isOwner ? (userProfile?.avatar_url || null) : null,
      },
      role,
      color,
      destination: undefined, // Skip location fetching for now
    });
  }

  console.log('[Calendar] Final trips:', trips.length, trips.map(t => ({ name: t.name, start: t.start_date, end: t.end_date, role: t.role })));

  return trips;
}

// Fetch travel pals (accepted friendships)
export async function fetchTravelPals(userId: string): Promise<TravelPal[]> {
  const supabase = createClient();

  // Simple query first to get friend IDs
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  console.log('[Calendar] Friendships:', { count: friendships?.length, error });

  if (!friendships || friendships.length === 0) return [];

  // Get friend user IDs
  const friendIds = friendships.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  // Get friend profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', friendIds);

  const pals: TravelPal[] = [];

  for (let i = 0; i < friendIds.length; i++) {
    const friendId = friendIds[i];
    const profile = profiles?.find((p) => p.id === friendId);

    if (!profile) continue;

    // Get trip count for this pal
    const { count } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', friendId)
      .not('start_date', 'is', null);

    pals.push({
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      trip_count: count || 0,
      color: getPalColor(i + 1),
    });
  }

  return pals;
}

// Fetch travel pals' visible trips
export async function fetchPalTrips(
  userId: string,
  palIds: string[]
): Promise<CalendarTrip[]> {
  if (palIds.length === 0) return [];

  const supabase = createClient();

  // Simple query
  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, start_date, end_date, user_id')
    .in('user_id', palIds)
    .not('start_date', 'is', null);

  if (!trips) return [];

  // Get pal profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', palIds);

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

    const owner = profiles?.find((p) => p.id === trip.user_id);

    calendarTrips.push({
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
      role: 'viewing',
      color: palColorMap.get(trip.user_id) || LEGEND_COLORS.viewing,
      destination: undefined,
    });
  }

  return calendarTrips;
}

// Fetch upcoming trips for sidebar
export async function fetchUpcomingTrips(userId: string): Promise<UpcomingTrip[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Get owned trips
  const { data: ownedTrips } = await supabase
    .from('trips')
    .select('id, name, start_date')
    .eq('user_id', userId)
    .gte('start_date', today)
    .not('start_date', 'is', null);

  // Get trip IDs where user is participant
  const { data: participations } = await supabase
    .from('trip_participants')
    .select('trip_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  let participatingTrips: any[] = [];
  if (participations && participations.length > 0) {
    const tripIds = participations.map((p) => p.trip_id);

    const { data: trips } = await supabase
      .from('trips')
      .select('id, name, start_date, user_id')
      .in('id', tripIds)
      .neq('user_id', userId)
      .gte('start_date', today)
      .not('start_date', 'is', null);

    participatingTrips = trips || [];
  }

  // Combine and deduplicate
  const allTrips = [...(ownedTrips || []), ...participatingTrips];
  const uniqueTrips = allTrips.filter((trip, index, self) =>
    index === self.findIndex((t) => t.id === trip.id)
  );

  // Sort by start_date and limit to 6
  const sortedTrips = uniqueTrips
    .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())
    .slice(0, 6);

  console.log('[Calendar] Upcoming trips:', sortedTrips.length);

  return sortedTrips.map((trip) => {
    const startDate = new Date(trip.start_date!);
    const now = new Date();
    const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: trip.id,
      name: trip.name,
      destination: undefined,
      start_date: trip.start_date!,
      days_until: daysUntil,
    };
  });
}

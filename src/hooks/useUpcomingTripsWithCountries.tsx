import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TripWithCountries {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  country_ids: string[];
}

async function fetchUpcomingTripsWithCountries(userId: string): Promise<TripWithCountries[]> {
  const today = new Date().toISOString().split('T')[0];

  // Fetch trips where user is owner or confirmed participant
  const { data: ownedTrips, error: ownedError } = await supabase
    .from('trips')
    .select(`
      id,
      name,
      destination,
      start_date,
      end_date,
      city_id,
      cities!trips_city_id_fkey (
        country_id
      )
    `)
    .eq('owner_id', userId)
    .or(`end_date.gte.${today},end_date.is.null`);

  if (ownedError) {
    console.error('Error fetching owned trips:', ownedError);
  }

  const { data: participatingTrips, error: participantError } = await supabase
    .from('trip_participants')
    .select(`
      trip_id,
      trips!inner (
        id,
        name,
        destination,
        start_date,
        end_date,
        city_id,
        cities!trips_city_id_fkey (
          country_id
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'confirmed');

  if (participantError) {
    console.error('Error fetching participating trips:', participantError);
  }

  // Combine and dedupe trips
  const tripMap = new Map<string, any>();
  
  (ownedTrips || []).forEach(trip => {
    tripMap.set(trip.id, trip);
  });
  
  (participatingTrips || []).forEach(p => {
    const trip = p.trips as any;
    if (trip && !tripMap.has(trip.id)) {
      // Check if it's upcoming
      if (!trip.end_date || trip.end_date >= today) {
        tripMap.set(trip.id, trip);
      }
    }
  });

  const allTrips = Array.from(tripMap.values());

  // Fetch locations for each trip to get all country_ids
  const tripIds = allTrips.map(t => t.id);
  
  const { data: locations, error: locationsError } = await supabase
    .from('trip_locations')
    .select(`
      trip_id,
      city_id,
      cities!trip_locations_city_id_fkey (
        country_id
      )
    `)
    .in('trip_id', tripIds);

  if (locationsError) {
    console.error('Error fetching trip locations:', locationsError);
  }

  // Build location country map
  const locationCountriesMap = new Map<string, Set<string>>();
  (locations || []).forEach(loc => {
    const countryId = (loc.cities as any)?.country_id;
    if (countryId) {
      if (!locationCountriesMap.has(loc.trip_id)) {
        locationCountriesMap.set(loc.trip_id, new Set());
      }
      locationCountriesMap.get(loc.trip_id)!.add(countryId);
    }
  });

  // Build final result
  return allTrips.map(trip => {
    const countryIds = new Set<string>();
    
    // Add main trip's country
    const mainCountryId = (trip.cities as any)?.country_id;
    if (mainCountryId) {
      countryIds.add(mainCountryId);
    }
    
    // Add location countries
    const locCountries = locationCountriesMap.get(trip.id);
    if (locCountries) {
      locCountries.forEach(id => countryIds.add(id));
    }

    return {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      country_ids: Array.from(countryIds),
    };
  });
}

export function useUpcomingTripsWithCountries() {
  const { user } = useAuth();

  const { data: trips = [], isLoading: loading } = useQuery({
    queryKey: ['upcoming-trips-with-countries', user?.id],
    queryFn: () => fetchUpcomingTripsWithCountries(user!.id),
    enabled: !!user,
  });

  return { trips, loading };
}

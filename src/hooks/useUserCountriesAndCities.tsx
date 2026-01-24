import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CountryVisit {
  id: string;
  name: string;
  emoji: string;
  recommendationCount: number;
  tripCount: number;
}

export interface CityVisit {
  id: string;
  name: string;
  countryId: string;
  countryEmoji: string;
  countryName: string;
  recommendationCount: number;
  tripCount: number;
}

async function fetchUserCountriesAndCities(userId: string, viewerId?: string) {
  // Get the viewer ID if not provided
  let actualViewerId = viewerId;
  if (!actualViewerId) {
    const { data: { user } } = await supabase.auth.getUser();
    actualViewerId = user?.id;
  }
  
  if (!actualViewerId) {
    return { countries: [], cities: [] };
  }

  // Use the RPC function that bypasses RLS for friends
  const { data, error } = await supabase.rpc('get_user_countries_and_cities', {
    _viewer_id: actualViewerId,
    _profile_id: userId
  });

  if (error) {
    console.error('Error fetching user countries and cities:', error);
    return { countries: [], cities: [] };
  }

  const countries: CountryVisit[] = [];
  const cities: CityVisit[] = [];

  data?.forEach((row: any) => {
    if (row.type === 'country') {
      countries.push({
        id: row.item_id,
        name: row.name,
        emoji: row.emoji || '',
        recommendationCount: row.rec_count || 0,
        tripCount: row.trip_count || 0,
      });
    } else if (row.type === 'city') {
      cities.push({
        id: row.item_id,
        name: row.name,
        countryId: '', // Not returned by RPC but not needed for display
        countryEmoji: row.country_emoji || '',
        countryName: row.country_name || '',
        recommendationCount: row.rec_count || 0,
        tripCount: row.trip_count || 0,
      });
    }
  });

  return {
    countries: countries.sort((a, b) => 
      (b.recommendationCount + b.tripCount) - (a.recommendationCount + a.tripCount)
    ),
    cities: cities.sort((a, b) => 
      (b.recommendationCount + b.tripCount) - (a.recommendationCount + a.tripCount)
    ),
  };
}

export function useUserCountriesAndCities(userId: string | undefined, viewerId?: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['userCountriesAndCities', userId, viewerId],
    queryFn: () => fetchUserCountriesAndCities(userId!, viewerId),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  return {
    countries: data?.countries || [],
    cities: data?.cities || [],
    loading: isLoading,
  };
}

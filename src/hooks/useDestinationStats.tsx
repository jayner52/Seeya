import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PopularLocation {
  location_name: string;
  country_emoji: string | null;
  country_name: string | null;
  trip_count: number;
  is_country: boolean;
}

async function fetchPopularLocations(userId: string): Promise<PopularLocation[]> {
  const { data, error } = await supabase.rpc('get_popular_locations', {
    _user_id: userId,
  });

  if (error) {
    console.error('Error fetching popular locations:', error);
    return [];
  }

  return (data || []).map((d: any) => ({
    location_name: d.location_name,
    country_emoji: d.country_emoji,
    country_name: d.country_name,
    trip_count: Number(d.trip_count),
    is_country: Boolean(d.is_country),
  }));
}

export function useDestinationStats() {
  const { user } = useAuth();

  const { data: destinations = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['popular-locations', user?.id],
    queryFn: () => fetchPopularLocations(user!.id),
    enabled: !!user,
  });

  return {
    destinations,
    loading,
    refresh: refetch,
  };
}

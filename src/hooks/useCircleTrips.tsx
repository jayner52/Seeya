import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type VisibilityLevel = Database['public']['Enums']['visibility_level'];

export interface CircleTrip {
  trip_id: string;
  trip_name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  visibility: VisibilityLevel;
  owner_id: string;
  owner_username: string;
  owner_full_name: string | null;
  owner_avatar_url: string | null;
  country_emoji: string | null;
}

async function fetchCircleTrips(userId: string): Promise<CircleTrip[]> {
  const { data, error } = await supabase.rpc('get_circle_trips', {
    _user_id: userId,
  });

  if (error) {
    console.error('Error fetching circle trips:', error);
    return [];
  }

  return (data || []) as CircleTrip[];
}

export function useCircleTrips() {
  const { user } = useAuth();

  const { data: trips = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['circle-trips', user?.id],
    queryFn: () => fetchCircleTrips(user!.id),
    enabled: !!user,
  });

  return {
    trips,
    loading,
    refresh: refetch,
  };
}

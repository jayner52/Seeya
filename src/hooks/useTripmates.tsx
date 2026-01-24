import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Tripmate {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  first_shared_trip_date: string;
}

async function fetchTripmates(userId: string): Promise<Tripmate[]> {
  // Get tripmate user IDs and first shared trip dates
  const { data: tripmateData, error: tripmateError } = await supabase
    .rpc('get_tripmates', { _user_id: userId });

  if (tripmateError) {
    console.error('Error fetching tripmates:', tripmateError);
    return [];
  }

  if (!tripmateData || tripmateData.length === 0) {
    return [];
  }

  // Fetch profiles for all tripmates
  const userIds = tripmateData.map((t: { user_id: string }) => t.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) {
    console.error('Error fetching tripmate profiles:', profilesError);
    return [];
  }

  // Combine profile data with first shared trip date
  return tripmateData.map((t: { user_id: string; first_shared_trip_date: string }) => {
    const profile = profiles?.find(p => p.id === t.user_id);
    return {
      id: t.user_id,
      username: profile?.username || 'Unknown',
      full_name: profile?.full_name || null,
      avatar_url: profile?.avatar_url || null,
      first_shared_trip_date: t.first_shared_trip_date,
    };
  });
}

export function useTripmates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tripmates = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['tripmates', user?.id],
    queryFn: () => fetchTripmates(user!.id),
    enabled: !!user,
  });

  return {
    tripmates,
    loading,
    refresh: refetch,
  };
}

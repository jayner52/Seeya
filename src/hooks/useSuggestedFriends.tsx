import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SuggestedFriend {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  suggestion_reason: string;
  mutual_count: number;
}

async function fetchSuggestedFriends(userId: string): Promise<SuggestedFriend[]> {
  const { data, error } = await supabase
    .rpc('get_suggested_friends', { _user_id: userId });

  if (error) {
    console.error('Error fetching suggested friends:', error);
    return [];
  }

  return data || [];
}

export function useSuggestedFriends() {
  const { user } = useAuth();

  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['suggested-friends', user?.id],
    queryFn: () => fetchSuggestedFriends(user!.id),
    enabled: !!user,
  });

  return {
    suggestions,
    loading: isLoading,
    refresh: refetch,
  };
}

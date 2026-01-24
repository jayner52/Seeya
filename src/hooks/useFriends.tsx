import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Profile, FriendshipStatus } from '@/lib/types';

interface FriendData {
  id: string;
  status: FriendshipStatus;
  created_at: string;
  isRequester: boolean;
  profile: Profile;
}

interface FriendsData {
  friends: FriendData[];
  pendingRequests: FriendData[];
}

async function fetchFriendsData(userId: string): Promise<FriendsData> {
  // Fetch friendships where user is requester
  const { data: asRequester } = await supabase
    .from('friendships')
    .select(`
      id,
      status,
      created_at,
      addressee_id,
      profiles!friendships_addressee_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        bio,
        created_at,
        updated_at
      )
    `)
    .eq('requester_id', userId);

  // Fetch friendships where user is addressee
  const { data: asAddressee } = await supabase
    .from('friendships')
    .select(`
      id,
      status,
      created_at,
      requester_id,
      profiles!friendships_requester_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        bio,
        created_at,
        updated_at
      )
    `)
    .eq('addressee_id', userId);

  const allFriends: FriendData[] = [];
  const pending: FriendData[] = [];

  // Process friendships where user is requester
  asRequester?.forEach((f: any) => {
    const friendData: FriendData = {
      id: f.id,
      status: f.status as FriendshipStatus,
      created_at: f.created_at,
      isRequester: true,
      profile: f.profiles as Profile,
    };

    if (f.status === 'accepted') {
      allFriends.push(friendData);
    } else if (f.status === 'pending') {
      pending.push(friendData);
    }
  });

  // Process friendships where user is addressee
  asAddressee?.forEach((f: any) => {
    const friendData: FriendData = {
      id: f.id,
      status: f.status as FriendshipStatus,
      created_at: f.created_at,
      isRequester: false,
      profile: f.profiles as Profile,
    };

    if (f.status === 'accepted') {
      allFriends.push(friendData);
    } else if (f.status === 'pending') {
      pending.push(friendData);
    }
  });

  return { friends: allFriends, pendingRequests: pending };
}

export function useFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: () => fetchFriendsData(user!.id),
    enabled: !!user,
  });

  const friends = data?.friends ?? [];
  const pendingRequests = data?.pendingRequests ?? [];

  const searchUsers = async (query: string) => {
    if (!user) return { data: null, error: new Error('Not authenticated') };
    if (!query || query.length < 3) return { data: [], error: null };

    const { data, error } = await supabase.rpc('search_users_for_friends', {
      _query: query
    });

    return { data, error };
  };

  const sendFriendRequestByIdMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      if (targetUserId === user.id) throw new Error('Cannot add yourself');

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'accepted') {
          throw new Error('Already friends');
        }
        throw new Error('Friend request already exists');
      }

      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['tripmates'] });
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['tripmates'] });
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', friendshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  // Wrapper functions for backward compatibility
  const sendFriendRequest = async (username: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Use secure RPC function to find user
    const { data: searchResults, error: searchError } = await searchUsers(username);
    
    if (searchError) return { error: searchError };
    
    // Find exact match from results
    const targetUser = searchResults?.find((u: any) => 
      u.username.toLowerCase() === username.toLowerCase()
    );
    
    if (!targetUser) return { error: new Error('User not found') };
    if (targetUser.id === user.id) return { error: new Error('Cannot add yourself') };

    return sendFriendRequestById(targetUser.id);
  };

  const sendFriendRequestById = async (targetUserId: string) => {
    try {
      await sendFriendRequestByIdMutation.mutateAsync(targetUserId);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      await acceptRequestMutation.mutateAsync(friendshipId);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const declineRequest = async (friendshipId: string) => {
    try {
      await declineRequestMutation.mutateAsync(friendshipId);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      await removeFriendMutation.mutateAsync(friendshipId);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return {
    friends,
    pendingRequests,
    loading,
    searchUsers,
    sendFriendRequest,
    sendFriendRequestById,
    acceptRequest,
    declineRequest,
    removeFriend,
    refresh: refetch,
  };
}

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type NotificationType = Database['public']['Enums']['notification_type'];

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  is_read: boolean;
  from_user_id: string | null;
  trip_id: string | null;
  friendship_id: string | null;
  created_at: string;
  from_user?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  trip?: {
    name: string;
  } | null;
}

async function fetchNotificationsData(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  // Fetch related data separately
  const fromUserIds = [...new Set(data?.map(n => n.from_user_id).filter(Boolean) as string[])];
  const tripIds = [...new Set(data?.map(n => n.trip_id).filter(Boolean) as string[])];

  const [profilesRes, tripsRes] = await Promise.all([
    fromUserIds.length > 0 
      ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', fromUserIds)
      : Promise.resolve({ data: [] as { id: string; username: string; full_name: string | null; avatar_url: string | null }[] }),
    tripIds.length > 0
      ? supabase.from('trips').select('id, name').in('id', tripIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] })
  ]);

  const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p] as const));
  const tripsMap = new Map((tripsRes.data || []).map(t => [t.id, t] as const));

  return (data || []).map(n => ({
    ...n,
    from_user: n.from_user_id ? profilesMap.get(n.from_user_id) || null : null,
    trip: n.trip_id ? tripsMap.get(n.trip_id) || null : null
  }));
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => fetchNotificationsData(user!.id),
    enabled: !!user,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Optimistically update the cache
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => 
        old?.map(n => n.id === id ? { ...n, is_read: true } : n) ?? []
      );
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      // Optimistically update the cache
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => 
        old?.map(n => ({ ...n, is_read: true })) ?? []
      );
    },
  });

  const markTripNotificationsAsReadMutation = useMutation({
    mutationFn: async (tripId: string) => {
      if (!user) throw new Error('Not authenticated');

      const tripNotificationTypes = ['trip_message', 'trip_resource', 'trip_recommendation'] as const;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('trip_id', tripId)
        .eq('is_read', false)
        .in('type', tripNotificationTypes);

      if (error) throw error;
      return tripId;
    },
    onSuccess: (tripId) => {
      const tripNotificationTypes = ['trip_message', 'trip_resource', 'trip_recommendation'] as const;
      // Optimistically update the cache
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) => 
        old?.map(n => 
          n.trip_id === tripId && (tripNotificationTypes as readonly string[]).includes(n.type)
            ? { ...n, is_read: true } 
            : n
        ) ?? []
      );
    },
  });

  const markAsRead = async (id: string) => {
    await markAsReadMutation.mutateAsync(id);
  };

  const markAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  const markTripNotificationsAsRead = async (tripId: string) => {
    const tripNotificationTypes = ['trip_message', 'trip_resource', 'trip_recommendation'] as const;
    const unreadTripNotifications = notifications.filter(
      n => !n.is_read && n.trip_id === tripId && (tripNotificationTypes as readonly string[]).includes(n.type)
    );

    if (unreadTripNotifications.length === 0) return;

    await markTripNotificationsAsReadMutation.mutateAsync(tripId);
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    markTripNotificationsAsRead,
    refetch
  };
}

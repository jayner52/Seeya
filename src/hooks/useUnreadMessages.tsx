import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [tripsWithUnread, setTripsWithUnread] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setTripsWithUnread(new Set());
      setLoading(false);
      return;
    }

    try {
      // Get all trips user owns or participates in
      const { data: ownedTrips } = await supabase
        .from('trips')
        .select('id')
        .eq('owner_id', user.id);

      const { data: participations } = await supabase
        .from('trip_participants')
        .select('trip_id')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'invited']);

      const tripIds = new Set<string>();
      ownedTrips?.forEach(t => tripIds.add(t.id));
      participations?.forEach(p => tripIds.add(p.trip_id));

      if (tripIds.size === 0) {
        setUnreadCount(0);
        setTripsWithUnread(new Set());
        setLoading(false);
        return;
      }

      const tripIdArray = Array.from(tripIds);

      // Get last read timestamps for each trip
      const { data: readStatuses } = await supabase
        .from('trip_chat_reads')
        .select('trip_id, last_read_at')
        .eq('user_id', user.id)
        .in('trip_id', tripIdArray);

      const lastReadMap = new Map<string, string>();
      readStatuses?.forEach(r => lastReadMap.set(r.trip_id, r.last_read_at));

      // Count unread messages across all trips and track which trips have unread
      let totalUnread = 0;
      const unreadTrips = new Set<string>();

      for (const tripId of tripIdArray) {
        const lastRead = lastReadMap.get(tripId);
        
        let query = supabase
          .from('trip_messages')
          .select('id', { count: 'exact', head: true })
          .eq('trip_id', tripId)
          .neq('user_id', user.id); // Don't count own messages as unread

        if (lastRead) {
          query = query.gt('created_at', lastRead);
        }

        const { count } = await query;
        const tripUnreadCount = count || 0;
        totalUnread += tripUnreadCount;
        
        if (tripUnreadCount > 0) {
          unreadTrips.add(tripId);
        }
      }

      setUnreadCount(totalUnread);
      setTripsWithUnread(unreadTrips);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markTripAsRead = useCallback(async (tripId: string) => {
    if (!user) return;

    // Optimistic update - remove trip from unread set immediately to prevent blink
    const wasUnread = tripsWithUnread.has(tripId);
    if (wasUnread) {
      setTripsWithUnread(prev => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      await supabase
        .from('trip_chat_reads')
        .upsert({
          user_id: user.id,
          trip_id: tripId,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,trip_id',
        });
    } catch (error) {
      console.error('Error marking trip as read:', error);
      // Revert optimistic update on error
      if (wasUnread) {
        fetchUnreadCount();
      }
    }
  }, [user, tripsWithUnread, fetchUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCount]);

  const hasUnreadMessagesForTrip = useCallback((tripId: string): boolean => {
    return tripsWithUnread.has(tripId);
  }, [tripsWithUnread]);

  return {
    unreadCount,
    loading,
    markTripAsRead,
    refresh: fetchUnreadCount,
    hasUnreadMessagesForTrip,
  };
}

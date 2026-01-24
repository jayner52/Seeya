import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TripChatPreview {
  trip: {
    id: string;
    name: string;
    destination: string;
    start_date: string | null;
    end_date: string | null;
    is_logged_past_trip: boolean | null;
    is_flexible_dates: boolean;
    flexible_month: string | null;
  };
  lastMessage: {
    content: string;
    created_at: string;
    sender: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    };
  } | null;
  participants: Array<{
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  messageCount: number;
  hasUnread: boolean;
  unreadCount: number;
}

export function useAllTripChats() {
  const { user } = useAuth();
  const [chatPreviews, setChatPreviews] = useState<TripChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const isFetching = useRef(false);

  const fetchChatPreviews = useCallback(async () => {
    if (!user) {
      setChatPreviews([]);
      setLoading(false);
      return;
    }

    // Prevent duplicate concurrent fetches
    if (isFetching.current) return;
    isFetching.current = true;

    // Only show loading skeleton on initial load
    if (isInitialLoad.current) {
      setLoading(true);
    }

    try {
      // Get all trips user owns or participates in
      const { data: ownedTrips } = await supabase
        .from('trips')
        .select('id, name, destination, owner_id, start_date, end_date, is_logged_past_trip, is_flexible_dates, flexible_month')
        .eq('owner_id', user.id);

      const { data: participations } = await supabase
        .from('trip_participants')
        .select('trip_id, trips:trip_id(id, name, destination, owner_id, start_date, end_date, is_logged_past_trip, is_flexible_dates, flexible_month)')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'invited']);

      // Combine and deduplicate trips
      const tripMap = new Map<string, { id: string; name: string; destination: string; owner_id: string; start_date: string | null; end_date: string | null; is_logged_past_trip: boolean | null; is_flexible_dates: boolean; flexible_month: string | null }>();
      
      ownedTrips?.forEach(t => tripMap.set(t.id, t));
      participations?.forEach(p => {
        const trip = p.trips as any;
        if (trip && !tripMap.has(trip.id)) {
          tripMap.set(trip.id, trip);
        }
      });

      const allTrips = Array.from(tripMap.values());

      if (allTrips.length === 0) {
        setChatPreviews([]);
        setLoading(false);
        return;
      }

      const tripIds = allTrips.map(t => t.id);

      // Get latest message for each trip
      const { data: messages } = await supabase
        .from('trip_messages')
        .select('id, trip_id, content, created_at, user_id')
        .in('trip_id', tripIds)
        .order('created_at', { ascending: false });

      // Get last read timestamps for the user
      const { data: readStatuses } = await supabase
        .from('trip_chat_reads')
        .select('trip_id, last_read_at')
        .eq('user_id', user.id)
        .in('trip_id', tripIds);

      const lastReadMap = new Map<string, string>();
      readStatuses?.forEach(r => lastReadMap.set(r.trip_id, r.last_read_at));

      // Get message counts per trip
      const messageCountMap = new Map<string, number>();
      const latestMessageMap = new Map<string, typeof messages extends (infer T)[] ? T : never>();
      
      messages?.forEach(msg => {
        const count = messageCountMap.get(msg.trip_id) || 0;
        messageCountMap.set(msg.trip_id, count + 1);
        
        if (!latestMessageMap.has(msg.trip_id)) {
          latestMessageMap.set(msg.trip_id, msg);
        }
      });

      // Get all unique user IDs for profile lookup
      const userIds = new Set<string>();
      allTrips.forEach(t => userIds.add(t.owner_id));
      messages?.forEach(m => userIds.add(m.user_id));

      // Get all participants for these trips
      const { data: allParticipants } = await supabase
        .from('trip_participants')
        .select('trip_id, user_id')
        .in('trip_id', tripIds)
        .in('status', ['confirmed', 'invited']);

      allParticipants?.forEach(p => userIds.add(p.user_id));

      // Fetch all profiles at once
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build chat previews
      const previews: TripChatPreview[] = allTrips.map(trip => {
        const latestMsg = latestMessageMap.get(trip.id);
        const tripParticipantIds = new Set<string>([trip.owner_id]);
        
        allParticipants?.forEach(p => {
          if (p.trip_id === trip.id) {
            tripParticipantIds.add(p.user_id);
          }
        });

        const participants = Array.from(tripParticipantIds)
          .map(id => profileMap.get(id))
          .filter(Boolean) as TripChatPreview['participants'];

        // Determine if there are unread messages and count them
        const lastRead = lastReadMap.get(trip.id);
        const tripMessages = messages?.filter(m => m.trip_id === trip.id) || [];
        
        const unreadMessages = tripMessages.filter(msg => 
          msg.user_id !== user.id && 
          (!lastRead || new Date(msg.created_at) > new Date(lastRead))
        );
        
        const hasUnread = unreadMessages.length > 0;
        const unreadCount = unreadMessages.length;

        return {
          trip: {
            id: trip.id,
            name: trip.name,
            destination: trip.destination,
            start_date: trip.start_date,
            end_date: trip.end_date,
            is_logged_past_trip: trip.is_logged_past_trip,
            is_flexible_dates: trip.is_flexible_dates,
            flexible_month: trip.flexible_month,
          },
          lastMessage: latestMsg ? {
            content: latestMsg.content,
            created_at: latestMsg.created_at,
            sender: profileMap.get(latestMsg.user_id) || {
              id: latestMsg.user_id,
              username: 'Unknown',
              full_name: null,
              avatar_url: null,
            },
          } : null,
          participants,
          messageCount: messageCountMap.get(trip.id) || 0,
          hasUnread,
          unreadCount,
        };
      });

      // Sort by most recent message, trips without messages at the end
      previews.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      setChatPreviews(previews);
    } catch (error) {
      console.error('Error fetching chat previews:', error);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
      isFetching.current = false;
    }
  }, [user]);

  useEffect(() => {
    fetchChatPreviews();
  }, [fetchChatPreviews]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('all-trip-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_messages',
        },
        () => {
          // Refresh on any message change
          fetchChatPreviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChatPreviews]);

  return {
    chatPreviews,
    loading,
    refresh: fetchChatPreviews,
  };
}

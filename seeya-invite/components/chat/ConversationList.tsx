'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export interface Conversation {
  tripId: string;
  tripName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageSenderName: string | null;
  unreadCount: number;
  participants: Array<{
    userId: string;
    fullName: string;
    avatarUrl: string | null;
  }>;
}

interface ConversationListProps {
  selectedTripId: string | null;
  onSelectConversation: (tripId: string) => void;
  className?: string;
}

export function ConversationList({
  selectedTripId,
  onSelectConversation,
  className,
}: ConversationListProps) {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();

    // Get all trips the user participates in or owns
    const [{ data: participations }, { data: ownedTrips }] = await Promise.all([
      supabase
        .from('trip_participants')
        .select('trip_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted'),
      supabase
        .from('trips')
        .select('id')
        .eq('user_id', user.id),
    ]);

    const participantTripIds = participations?.map((p) => p.trip_id) || [];
    const ownedTripIds = ownedTrips?.map((t) => t.id) || [];
    const allTripIds = Array.from(new Set([...participantTripIds, ...ownedTripIds]));

    if (allTripIds.length === 0) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    // Fetch trip details, participants, last messages, and read status in parallel
    const [
      { data: trips },
      { data: allParticipants },
      { data: lastMessages },
      { data: readStatuses },
    ] = await Promise.all([
      supabase
        .from('trips')
        .select('id, name')
        .in('id', allTripIds),
      supabase
        .from('trip_participants')
        .select('trip_id, user_id, profiles:user_id (id, full_name, avatar_url)')
        .in('trip_id', allTripIds)
        .eq('status', 'accepted'),
      // Get the most recent message per trip (using a subquery approach)
      supabase
        .from('trip_messages')
        .select('id, trip_id, user_id, content, created_at')
        .in('trip_id', allTripIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('trip_chat_reads')
        .select('trip_id, last_read_at')
        .eq('user_id', user.id)
        .in('trip_id', allTripIds),
    ]);

    if (!trips) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    // Get profile data for message senders
    const senderIds = Array.from(
      new Set((lastMessages || []).map((m) => m.user_id))
    );
    let senderProfiles: Record<string, string> = {};
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds);
      if (profiles) {
        senderProfiles = Object.fromEntries(
          profiles.map((p) => [p.id, p.full_name])
        );
      }
    }

    // Build read status lookup
    const readStatusMap = new Map(
      (readStatuses || []).map((r) => [r.trip_id, r.last_read_at])
    );

    // Group messages by trip, get the latest for each
    const latestMessageByTrip = new Map<
      string,
      { content: string; created_at: string; user_id: string }
    >();
    for (const msg of lastMessages || []) {
      if (!latestMessageByTrip.has(msg.trip_id)) {
        latestMessageByTrip.set(msg.trip_id, msg);
      }
    }

    // Count unread messages per trip
    const unreadCountByTrip = new Map<string, number>();
    for (const msg of lastMessages || []) {
      const lastRead = readStatusMap.get(msg.trip_id);
      if (
        msg.user_id !== user.id &&
        (!lastRead || new Date(msg.created_at) > new Date(lastRead))
      ) {
        unreadCountByTrip.set(
          msg.trip_id,
          (unreadCountByTrip.get(msg.trip_id) || 0) + 1
        );
      }
    }

    // Build conversation objects
    const convos: Conversation[] = trips.map((trip) => {
      const latestMsg = latestMessageByTrip.get(trip.id);
      const tripParticipants = (allParticipants || [])
        .filter((p) => p.trip_id === trip.id)
        .map((p) => {
          const profile = p.profiles as unknown as {
            id: string;
            full_name: string;
            avatar_url: string | null;
          } | null;
          return {
            userId: p.user_id,
            fullName: profile?.full_name || 'Unknown',
            avatarUrl: profile?.avatar_url || null,
          };
        });

      return {
        tripId: trip.id,
        tripName: trip.name,
        lastMessage: latestMsg?.content || null,
        lastMessageAt: latestMsg?.created_at || null,
        lastMessageSenderName: latestMsg
          ? latestMsg.user_id === user.id
            ? 'You'
            : senderProfiles[latestMsg.user_id] || 'Unknown'
          : null,
        unreadCount: unreadCountByTrip.get(trip.id) || 0,
        participants: tripParticipants,
      };
    });

    // Sort: conversations with recent messages first, then by trip name
    convos.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return (
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
        );
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.tripName.localeCompare(b.tripName);
    });

    setConversations(convos);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to new messages to refresh the list
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = supabase
      .channel('conversation-list-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 px-4 text-center',
          className
        )}
      >
        <div className="w-16 h-16 rounded-full bg-seeya-card flex items-center justify-center mb-4">
          <MessageSquare size={28} className="text-seeya-text-secondary" />
        </div>
        <h3 className="font-semibold text-seeya-text mb-1">No conversations yet</h3>
        <p className="text-sm text-seeya-text-secondary max-w-xs">
          Join or create a trip to start chatting with your travel companions.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('divide-y divide-seeya-border', className)}>
      {conversations.map((convo) => (
        <button
          key={convo.tripId}
          onClick={() => onSelectConversation(convo.tripId)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
            'hover:bg-seeya-card',
            selectedTripId === convo.tripId && 'bg-seeya-card'
          )}
        >
          {/* Avatar stack or single avatar */}
          <div className="flex-shrink-0">
            {convo.participants.length > 0 ? (
              <Avatar
                name={convo.tripName}
                avatarUrl={convo.participants[0]?.avatarUrl}
                size="md"
              />
            ) : (
              <Avatar name={convo.tripName} size="md" />
            )}
          </div>

          {/* Conversation details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4
                className={cn(
                  'text-sm truncate',
                  convo.unreadCount > 0
                    ? 'font-semibold text-seeya-text'
                    : 'font-medium text-seeya-text'
                )}
              >
                {convo.tripName}
              </h4>
              {convo.lastMessageAt && (
                <span className="text-xs text-seeya-text-tertiary flex-shrink-0">
                  {formatDistanceToNow(parseISO(convo.lastMessageAt), {
                    addSuffix: false,
                  })}
                </span>
              )}
            </div>
            {convo.lastMessage && (
              <p
                className={cn(
                  'text-sm truncate mt-0.5',
                  convo.unreadCount > 0
                    ? 'text-seeya-text font-medium'
                    : 'text-seeya-text-secondary'
                )}
              >
                {convo.lastMessageSenderName}: {convo.lastMessage}
              </p>
            )}
            {!convo.lastMessage && (
              <p className="text-sm text-seeya-text-tertiary mt-0.5 italic">
                No messages yet
              </p>
            )}
          </div>

          {/* Unread indicator */}
          {convo.unreadCount > 0 && (
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-seeya-purple text-white text-xs font-semibold flex items-center justify-center">
              {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

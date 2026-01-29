import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TypingUser {
  id: string;
  username: string;
  full_name: string | null;
}

export function useTypingPresence(tripId: string) {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !tripId) return;

    const channel = supabase.channel(`typing:${tripId}`);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.user_id !== user.id && presence.is_typing) {
              typing.push({
                id: presence.user_id,
                username: presence.username,
                full_name: presence.full_name,
              });
            }
          });
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: profile?.username || 'User',
            full_name: profile?.full_name,
            is_typing: false,
          });
        }
      });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user, tripId, profile]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user) return;

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    await channelRef.current.track({
      user_id: user.id,
      username: profile?.username || 'User',
      full_name: profile?.full_name,
      is_typing: isTyping,
    });

    // Auto-stop typing after 3 seconds of inactivity
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({
          user_id: user.id,
          username: profile?.username || 'User',
          full_name: profile?.full_name,
          is_typing: false,
        });
      }, 3000);
    }
  }, [user, profile]);

  return { typingUsers, setTyping };
}

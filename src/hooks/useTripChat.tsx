import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ChatMessage {
  id: string;
  trip_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useTripChat(tripId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const fetchMessages = useCallback(async () => {
    if (!tripId) return;

    // Only show loading spinner on initial load
    if (isInitialLoad.current) {
      setLoading(true);
    }
    const { data, error } = await supabase
      .from('trip_messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for all unique user_ids
    const userIds = [...new Set(data.map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const messagesWithProfiles = data.map(msg => ({
      ...msg,
      profile: profileMap.get(msg.user_id)
    }));

    setMessages(messagesWithProfiles);
    setLoading(false);
    isInitialLoad.current = false;
  }, [tripId]);

  const sendMessage = async (content: string) => {
    if (!tripId || !user || !content.trim()) return { error: new Error('Invalid input') };

    const { data, error } = await supabase
      .from('trip_messages')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { error };
    }

    return { data, error: null };
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('trip_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return { error };
    }

    setMessages(prev => prev.filter(m => m.id !== messageId));
    return { error: null };
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tripId) return;

    fetchMessages();

    const channel = supabase
      .channel(`trip-chat-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Fetch profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', newMessage.user_id)
            .single();

          setMessages(prev => [...prev, { ...newMessage, profile: profile || undefined }]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          const deletedMessage = payload.old as { id: string };
          setMessages(prev => prev.filter(m => m.id !== deletedMessage.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage
  };
}

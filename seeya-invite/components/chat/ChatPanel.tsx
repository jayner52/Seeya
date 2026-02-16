'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isSameDay } from 'date-fns';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  tripId: string;
  userId: string;
  content: string;
  createdAt: string;
  sender: {
    fullName: string;
    avatarUrl: string | null;
  };
}

interface ChatPanelProps {
  tripId: string;
  tripName: string;
  onBack?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessageTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'h:mm a');
}

function formatDaySeparator(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatPanel({ tripId, tripName, onBack, className }: ChatPanelProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const profileCacheRef = useRef<Map<string, { fullName: string; avatarUrl: string | null }>>(
    new Map()
  );

  // -----------------------------------------------------------------------
  // Scroll to bottom
  // -----------------------------------------------------------------------

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // Use requestAnimationFrame to ensure DOM has updated before scrolling
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  // -----------------------------------------------------------------------
  // Fetch sender profile (with cache)
  // -----------------------------------------------------------------------

  const fetchSenderProfile = useCallback(
    async (
      userId: string
    ): Promise<{ fullName: string; avatarUrl: string | null }> => {
      const cached = profileCacheRef.current.get(userId);
      if (cached) return cached;

      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();

      const profile = {
        fullName: data?.full_name || 'Unknown',
        avatarUrl: data?.avatar_url || null,
      };
      profileCacheRef.current.set(userId, profile);
      return profile;
    },
    []
  );

  // -----------------------------------------------------------------------
  // Fetch messages
  // -----------------------------------------------------------------------

  const fetchMessages = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    const { data: rawMessages } = await supabase
      .from('trip_messages')
      .select('id, trip_id, user_id, content, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (!rawMessages || rawMessages.length === 0) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    // Fetch profiles for all unique senders
    const uniqueSenderIds = Array.from(
      new Set(rawMessages.map((m) => m.user_id))
    );
    const profiles = await Promise.all(
      uniqueSenderIds.map((id) => fetchSenderProfile(id))
    );
    const profileMap = new Map(
      uniqueSenderIds.map((id, idx) => [id, profiles[idx]])
    );

    const msgs: Message[] = rawMessages.map((m) => ({
      id: m.id,
      tripId: m.trip_id,
      userId: m.user_id,
      content: m.content,
      createdAt: m.created_at,
      sender: profileMap.get(m.user_id) || {
        fullName: 'Unknown',
        avatarUrl: null,
      },
    }));

    setMessages(msgs);
    setIsLoading(false);
  }, [user, tripId, fetchSenderProfile]);

  // -----------------------------------------------------------------------
  // Mark messages as read
  // -----------------------------------------------------------------------

  const markAsRead = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    await supabase.from('trip_chat_reads').upsert(
      {
        user_id: user.id,
        trip_id: tripId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,trip_id' }
    );
  }, [user, tripId]);

  // -----------------------------------------------------------------------
  // Initial load and realtime subscription
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom after initial messages load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom('instant');
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as read when viewing
  useEffect(() => {
    if (!isLoading) {
      markAsRead();
    }
  }, [isLoading, tripId, markAsRead]);

  // Realtime: new messages + typing presence
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channelName = `chat:${tripId}`;

    const channel = supabase
      .channel(channelName)
      // Listen for new messages via postgres_changes
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          const newRow = payload.new as {
            id: string;
            trip_id: string;
            user_id: string;
            content: string;
            created_at: string;
          };

          const sender = await fetchSenderProfile(newRow.user_id);

          const newMessage: Message = {
            id: newRow.id,
            tripId: newRow.trip_id,
            userId: newRow.user_id,
            content: newRow.content,
            createdAt: newRow.created_at,
            sender,
          };

          setMessages((prev) => {
            // Avoid duplicates (e.g. from optimistic insert)
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          scrollToBottom();
          markAsRead();
        }
      )
      // Presence: typing indicators
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string; full_name: string; typing: boolean }>();
        const typing: string[] = [];
        for (const key of Object.keys(state)) {
          for (const presence of state[key]) {
            if (presence.typing && presence.user_id !== user.id) {
              typing.push(presence.full_name);
            }
          }
        }
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our own presence (not typing initially)
          await channel.track({
            user_id: user.id,
            full_name:
              user.user_metadata?.full_name || user.email || 'Unknown',
            typing: false,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, tripId, fetchSenderProfile, scrollToBottom, markAsRead]);

  // -----------------------------------------------------------------------
  // Typing indicator broadcast
  // -----------------------------------------------------------------------

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!user || !channelRef.current) return;
      channelRef.current.track({
        user_id: user.id,
        full_name:
          user.user_metadata?.full_name || user.email || 'Unknown',
        typing: isTyping,
      });
    },
    [user]
  );

  // Debounced typing stop
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      if (value.length > 0) {
        setTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      } else {
        setTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    },
    [setTyping]
  );

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Send message
  // -----------------------------------------------------------------------

  const sendMessage = useCallback(async () => {
    if (!user || !inputValue.trim() || isSending) return;

    const content = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setTyping(false);

    const supabase = createClient();
    const { error } = await supabase.from('trip_messages').insert({
      trip_id: tripId,
      user_id: user.id,
      content,
    });

    if (error) {
      console.error('Failed to send message:', error);
      // Restore the input value so the user can retry
      setInputValue(content);
    }

    setIsSending(false);
  }, [user, inputValue, isSending, tripId, setTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function shouldShowDaySeparator(
    currentMsg: Message,
    prevMsg: Message | undefined
  ): boolean {
    if (!prevMsg) return true;
    return !isSameDay(parseISO(currentMsg.createdAt), parseISO(prevMsg.createdAt));
  }

  function shouldShowAvatar(
    currentMsg: Message,
    prevMsg: Message | undefined
  ): boolean {
    if (!prevMsg) return true;
    if (prevMsg.userId !== currentMsg.userId) return true;
    if (!isSameDay(parseISO(currentMsg.createdAt), parseISO(prevMsg.createdAt)))
      return true;
    // Group within 5 minutes
    const diff =
      new Date(currentMsg.createdAt).getTime() -
      new Date(prevMsg.createdAt).getTime();
    return diff > 5 * 60 * 1000;
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-seeya-border bg-white flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-seeya-text-secondary hover:text-seeya-text transition-colors"
            aria-label="Back to conversations"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-seeya-text truncate text-sm">
            {tripName}
          </h2>
          {typingUsers.length > 0 && (
            <p className="text-xs text-seeya-purple truncate">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.slice(0, 2).join(', ')} ${
                    typingUsers.length > 2
                      ? `and ${typingUsers.length - 2} more are`
                      : 'are'
                  } typing...`}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-seeya-card flex items-center justify-center mb-3">
              <MessageSquare size={24} className="text-seeya-text-secondary" />
            </div>
            <p className="text-sm font-medium text-seeya-text mb-1">
              No messages yet
            </p>
            <p className="text-xs text-seeya-text-secondary max-w-[220px]">
              Send a message to start the conversation with your trip group.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : undefined;
            const isOwn = msg.userId === user?.id;
            const showDay = shouldShowDaySeparator(msg, prevMsg);
            const showAvatar = shouldShowAvatar(msg, prevMsg);

            return (
              <div key={msg.id}>
                {/* Day separator */}
                {showDay && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 text-xs font-medium text-seeya-text-secondary bg-seeya-card rounded-full">
                      {formatDaySeparator(msg.createdAt)}
                    </span>
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={cn(
                    'flex items-end gap-2',
                    isOwn ? 'justify-end' : 'justify-start',
                    showAvatar ? 'mt-3' : 'mt-0.5'
                  )}
                >
                  {/* Other user avatar */}
                  {!isOwn && (
                    <div className="w-7 flex-shrink-0">
                      {showAvatar && (
                        <Avatar
                          name={msg.sender.fullName}
                          avatarUrl={msg.sender.avatarUrl}
                          size="xs"
                        />
                      )}
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[75%] flex flex-col',
                      isOwn ? 'items-end' : 'items-start'
                    )}
                  >
                    {/* Sender name (for others, first in group) */}
                    {!isOwn && showAvatar && (
                      <span className="text-xs font-medium text-seeya-text-secondary ml-1 mb-0.5">
                        {msg.sender.fullName}
                      </span>
                    )}

                    <div
                      className={cn(
                        'px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
                        isOwn
                          ? 'bg-seeya-purple text-white rounded-2xl rounded-br-md'
                          : 'bg-seeya-card text-seeya-text rounded-2xl rounded-bl-md'
                      )}
                    >
                      {msg.content}
                    </div>

                    {/* Timestamp (shown for first in group) */}
                    {showAvatar && (
                      <span className="text-[10px] text-seeya-text-tertiary mt-0.5 mx-1">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Spacer on own messages to match avatar width */}
                  {isOwn && <div className="w-0 flex-shrink-0" />}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 mt-2">
            <div className="w-7 flex-shrink-0" />
            <div className="bg-seeya-card rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-seeya-text-secondary animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-seeya-text-secondary animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-seeya-text-secondary animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-seeya-border bg-white px-4 py-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-seeya-input border border-seeya-border bg-white px-3 py-2 text-sm',
              'placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:border-seeya-primary focus:ring-seeya-primary/20',
              'max-h-32 transition-all duration-200'
            )}
            style={{
              height: 'auto',
              minHeight: '38px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isSending}
            className={cn(
              'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors',
              inputValue.trim() && !isSending
                ? 'bg-seeya-purple text-white hover:opacity-90'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            {isSending ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

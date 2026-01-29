import { useState, useRef, useEffect, useCallback } from 'react';
import { useTripChat } from '@/hooks/useTripChat';
import { useTypingPresence } from '@/hooks/useTypingPresence';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { EmojiPicker } from './EmojiPicker';

interface TripChatProps {
  tripId: string;
}

export function TripChat({ tripId }: TripChatProps) {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useTripChat(tripId);
  const { typingUsers, setTyping } = useTypingPresence(tripId);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setTyping(false);
    const { error } = await sendMessage(newMessage);
    setSending(false);

    if (!error) {
      setNewMessage('');
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      setTyping(true);
    } else {
      setTyping(false);
    }
  }, [setTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (fullName: string | null | undefined, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.user_id === user?.id;
            const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;

            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                {!isOwn && showAvatar ? (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={message.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.profile?.full_name, message.profile?.username || '?')}
                    </AvatarFallback>
                  </Avatar>
                ) : !isOwn ? (
                  <div className="w-8 flex-shrink-0" />
                ) : null}

                <div className={cn("flex flex-col max-w-[75%]", isOwn ? "items-end" : "items-start")}>
                  {!isOwn && showAvatar && (
                    <span className="text-xs text-muted-foreground mb-1">
                      {message.profile?.full_name || message.profile?.username}
                    </span>
                  )}
                  <div
                    className={cn(
                      "px-3 py-2 rounded-2xl text-sm",
                      isOwn
                        ? "bg-foreground text-background rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    {message.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {formatMessageTime(message.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0].full_name || typingUsers[0].username} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0].full_name || typingUsers[0].username} and ${typingUsers[1].full_name || typingUsers[1].username} are typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <EmojiPicker 
            onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)}
            disabled={sending}
          />
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

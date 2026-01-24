import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle } from 'lucide-react';

interface MessageNotificationPayload {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  from_user_id: string;
  trip_id: string;
  created_at: string;
}

export function useMessageNotifications() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNewMessageNotification = useCallback(async (payload: MessageNotificationPayload) => {
    // Don't show toast for your own messages
    if (payload.from_user_id === user?.id) return;

    // Check if user is already viewing this conversation in Messages page
    const searchParams = new URLSearchParams(location.search);
    const currentTripId = searchParams.get('tripId');
    if (location.pathname === '/messages' && currentTripId === payload.trip_id) {
      return;
    }

    // Fetch sender profile and trip info
    const [senderResult, tripResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', payload.from_user_id)
        .single(),
      supabase
        .from('trips')
        .select('name, destination')
        .eq('id', payload.trip_id)
        .single()
    ]);

    const sender = senderResult.data;
    const trip = tripResult.data;

    if (!sender || !trip) return;

    const senderName = sender.full_name || sender.username || 'Someone';
    const tripName = trip.name || trip.destination;

    // Show toast notification
    toast.custom(
      (toastId) => (
        <div
          className="flex items-start gap-3 p-4 bg-background border border-border rounded-lg shadow-lg cursor-pointer hover:bg-muted/50 transition-colors max-w-sm"
          onClick={() => {
            toast.dismiss(toastId);
            navigate(`/messages?tripId=${payload.trip_id}`);
          }}
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={sender.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {senderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">{senderName}</p>
            <p className="text-xs text-muted-foreground truncate">in "{tripName}"</p>
            <p className="text-sm text-foreground/80 mt-1 line-clamp-2">
              {payload.message?.replace(`${senderName} sent a message in "${tripName}"`, 'New message')}
            </p>
          </div>
          <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>
      ),
      {
        duration: 5000,
        position: 'top-right',
      }
    );
  }, [user?.id, location, navigate]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as MessageNotificationPayload;
          // Only handle trip message notifications
          if (notification.type === 'trip_message') {
            handleNewMessageNotification(notification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, handleNewMessageNotification]);
}

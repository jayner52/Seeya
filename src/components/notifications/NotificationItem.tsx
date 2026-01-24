import { useState } from 'react';
import { UserPlus, UserCheck, Ticket, Check, X, Map, MessageCircle, FolderOpen, Lightbulb, UserCog } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFriends } from '@/hooks/useFriends';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  trip_invite: Ticket,
  trip_accepted: Check,
  trip_declined: X,
  friend_trip: Map,
  trip_message: MessageCircle,
  trip_resource: FolderOpen,
  trip_tripbit: FolderOpen,
  trip_recommendation: Lightbulb,
  join_request: UserCog,
  tripbit_participant_added: UserPlus
};

const colorMap: Record<string, string> = {
  friend_request: 'text-blue-500',
  friend_accepted: 'text-green-500',
  trip_invite: 'text-amber-500',
  trip_accepted: 'text-green-500',
  trip_declined: 'text-red-500',
  friend_trip: 'text-purple-500',
  trip_message: 'text-cyan-500',
  trip_resource: 'text-indigo-500',
  trip_tripbit: 'text-indigo-500',
  trip_recommendation: 'text-orange-500',
  join_request: 'text-teal-500',
  tripbit_participant_added: 'text-violet-500'
};

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const navigate = useNavigate();
  const { acceptRequest, declineRequest } = useFriends();
  const [isLoading, setIsLoading] = useState(false);
  const Icon = iconMap[notification.type] || MessageCircle;
  const iconColor = colorMap[notification.type] || 'text-muted-foreground';

  const getInitials = () => {
    if (notification.from_user?.full_name) {
      return notification.from_user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (notification.from_user?.username) {
      return notification.from_user.username.slice(0, 2).toUpperCase();
    }
    return '?';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.friendship_id) return;
    setIsLoading(true);
    try {
      await acceptRequest(notification.friendship_id);
      onRead(notification.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.friendship_id) return;
    setIsLoading(true);
    try {
      await declineRequest(notification.friendship_id);
      onRead(notification.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }

    // Navigate based on type
    const tripTypes = ['trip_invite', 'trip_accepted', 'trip_declined', 'friend_trip', 'trip_message', 'trip_resource', 'trip_tripbit', 'trip_recommendation', 'join_request', 'tripbit_participant_added'];
    if (notification.trip_id && tripTypes.includes(notification.type)) {
      navigate(`/trips/${notification.trip_id}`);
    } else if (['friend_request', 'friend_accepted'].includes(notification.type)) {
      navigate('/friends');
    }
  };

  const isFriendRequest = notification.type === 'friend_request' && !notification.is_read && notification.friendship_id;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 rounded-lg',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={notification.from_user?.avatar_url || undefined} />
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
        <div className={cn('absolute -bottom-1 -right-1 p-1 rounded-full bg-card', iconColor)}>
          <Icon className="h-3 w-3" />
        </div>
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{notification.title}</span>
          {!notification.is_read && (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <span className="text-xs text-muted-foreground">
          {formatTime(notification.created_at)}
        </span>
        
        {isFriendRequest && (
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              onClick={handleAccept} 
              disabled={isLoading}
              className="h-7 px-3"
            >
              <Check className="h-3 w-3 mr-1" />
              Accept
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDecline} 
              disabled={isLoading}
              className="h-7 px-3"
            >
              <X className="h-3 w-3 mr-1" />
              Decline
            </Button>
          </div>
        )}
      </div>
    </button>
  );
}

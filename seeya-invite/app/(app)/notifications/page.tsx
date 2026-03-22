'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Avatar, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  UserPlus,
  UserCheck,
  Plane,
  MessageSquare,
  BookOpen,
  Sparkles,
  Package,
  Users,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import Link from 'next/link';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  from_user_id: string | null;
  trip_id: string | null;
  friendship_id: string | null;
  created_at: string;
  from_user?: { id: string; full_name: string; avatar_url: string | null } | null;
  trip?: { id: string; name: string } | null;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  friend_request: { icon: UserPlus, color: 'bg-blue-50 text-blue-600' },
  friend_accepted: { icon: UserCheck, color: 'bg-green-50 text-green-600' },
  trip_invite: { icon: Plane, color: 'bg-purple-50 text-purple-600' },
  trip_accepted: { icon: Check, color: 'bg-green-50 text-green-600' },
  trip_declined: { icon: BellOff, color: 'bg-red-50 text-red-600' },
  trip_message: { icon: MessageSquare, color: 'bg-blue-50 text-blue-600' },
  trip_resource: { icon: BookOpen, color: 'bg-orange-50 text-orange-600' },
  trip_recommendation: { icon: Sparkles, color: 'bg-purple-50 text-purple-600' },
  trip_tripbit: { icon: Package, color: 'bg-orange-50 text-orange-600' },
  join_request: { icon: Users, color: 'bg-blue-50 text-blue-600' },
  tripbit_participant_added: { icon: Users, color: 'bg-green-50 text-green-600' },
  friend_trip: { icon: Plane, color: 'bg-purple-50 text-purple-600' },
  trip_maybe: { icon: HelpCircle, color: 'bg-yellow-50 text-yellow-600' },
  trip_updated: { icon: RefreshCw, color: 'bg-blue-50 text-blue-600' },
};

function groupNotificationsByDate(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  notifications.forEach((n) => {
    const date = new Date(n.created_at);
    if (isToday(date)) today.push(n);
    else if (isYesterday(date)) yesterday.push(n);
    else earlier.push(n);
  });

  if (today.length > 0) groups.push({ label: 'Today', items: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
  if (earlier.length > 0) groups.push({ label: 'Earlier', items: earlier });

  return groups;
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = typeConfig[notification.type] || { icon: Bell, color: 'bg-gray-50 text-gray-600' };
  const Icon = config.icon;

  const getLink = () => {
    if (notification.trip_id) {
      if (notification.type === 'trip_message') return `/messages?trip=${notification.trip_id}`;
      return `/trips/${notification.trip_id}`;
    }
    if (notification.type === 'friend_request' || notification.type === 'friend_accepted') return '/circle';
    return '#';
  };

  return (
    <Link
      href={getLink()}
      onClick={() => {
        if (!notification.is_read) onMarkRead(notification.id);
      }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl transition-colors hover:bg-gray-50',
        !notification.is_read && 'bg-seeya-purple/5'
      )}
    >
      {/* Avatar or Icon */}
      {notification.from_user ? (
        <Avatar
          name={notification.from_user.full_name}
          avatarUrl={notification.from_user.avatar_url}
          size="md"
        />
      ) : (
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', config.color)}>
          <Icon size={20} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-seeya-text', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-sm text-seeya-text-secondary mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div className="w-2.5 h-2.5 rounded-full bg-seeya-purple shrink-0 mt-2" />
      )}
    </Link>
  );
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        from_user:profiles!notifications_from_user_id_fkey (id, full_name, avatar_url),
        trip:trips!notifications_trip_id_fkey (id, name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data as Notification[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel('page-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups = groupNotificationsByDate(notifications);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-semibold text-seeya-text flex items-center gap-2">
              <Bell className="text-seeya-purple" size={28} />
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-seeya-text-secondary mt-1">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="gap-1.5">
              <CheckCheck size={16} />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification groups */}
        {groups.length > 0 ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-medium text-seeya-text-secondary mb-2 px-2">
                  {group.label}
                </h3>
                <Card variant="outline" padding="none" className="divide-y divide-gray-100">
                  {group.items.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={markAsRead}
                    />
                  ))}
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card variant="elevated" padding="lg" className="text-center py-16">
            <Bell size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-seeya-text mb-1">
              No notifications yet
            </h3>
            <p className="text-sm text-seeya-text-secondary">
              You&apos;ll see updates about trips, friends, and messages here
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

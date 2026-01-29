import { PageLayout } from '@/components/layout/PageLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';

export default function Notifications() {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const groupNotifications = () => {
    const today: typeof notifications = [];
    const yesterday: typeof notifications = [];
    const thisWeek: typeof notifications = [];
    const earlier: typeof notifications = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

    notifications.forEach(n => {
      const date = new Date(n.created_at);
      if (date >= todayStart) {
        today.push(n);
      } else if (date >= yesterdayStart) {
        yesterday.push(n);
      } else if (date >= weekStart) {
        thisWeek.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, thisWeek, earlier };
  };

  const groups = groupNotifications();

  return (
    <PageLayout title="Notifications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">No notifications yet</h3>
            <p className="text-muted-foreground text-sm">
              You'll see updates about trips and friend requests here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.today.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Today</h3>
                <div className="bg-card rounded-xl border border-border divide-y divide-border">
                  {groups.today.map(n => (
                    <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                  ))}
                </div>
              </div>
            )}

            {groups.yesterday.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Yesterday</h3>
                <div className="bg-card rounded-xl border border-border divide-y divide-border">
                  {groups.yesterday.map(n => (
                    <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                  ))}
                </div>
              </div>
            )}

            {groups.thisWeek.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">This Week</h3>
                <div className="bg-card rounded-xl border border-border divide-y divide-border">
                  {groups.thisWeek.map(n => (
                    <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                  ))}
                </div>
              </div>
            )}

            {groups.earlier.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Earlier</h3>
                <div className="bg-card rounded-xl border border-border divide-y divide-border">
                  {groups.earlier.map(n => (
                    <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

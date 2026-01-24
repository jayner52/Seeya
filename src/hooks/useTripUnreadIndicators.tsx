import { useMemo } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

const TRIP_UPDATE_TYPES = ['trip_message', 'trip_resource', 'trip_recommendation'] as const;

export function useTripUnreadIndicators() {
  const { notifications } = useNotifications();

  const tripUnreadMap = useMemo(() => {
    const map = new Map<string, boolean>();
    
    notifications.forEach(notification => {
      if (
        !notification.is_read &&
        notification.trip_id &&
        TRIP_UPDATE_TYPES.includes(notification.type as typeof TRIP_UPDATE_TYPES[number])
      ) {
        map.set(notification.trip_id, true);
      }
    });
    
    return map;
  }, [notifications]);

  const getHasUnread = (tripId: string): boolean => {
    return tripUnreadMap.get(tripId) || false;
  };

  return { tripUnreadMap, getHasUnread };
}

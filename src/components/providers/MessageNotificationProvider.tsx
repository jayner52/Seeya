import { ReactNode } from 'react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

interface MessageNotificationProviderProps {
  children: ReactNode;
}

function MessageNotificationListener() {
  useMessageNotifications();
  return null;
}

export function MessageNotificationProvider({ children }: MessageNotificationProviderProps) {
  return (
    <>
      <MessageNotificationListener />
      {children}
    </>
  );
}

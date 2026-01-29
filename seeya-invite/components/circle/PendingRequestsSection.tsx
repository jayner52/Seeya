'use client';

import { Card } from '@/components/ui';
import { RequestCard } from './RequestCard';
import { Clock, Inbox, Send } from 'lucide-react';
import type { Profile } from '@/types/database';

interface FriendshipRequest {
  id: string;
  profile: Profile;
  createdAt: string;
}

interface PendingRequestsSectionProps {
  incoming: FriendshipRequest[];
  outgoing: FriendshipRequest[];
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
  onCancel: (requestId: string) => Promise<void>;
  className?: string;
}

export function PendingRequestsSection({
  incoming,
  outgoing,
  onAccept,
  onDecline,
  onCancel,
  className,
}: PendingRequestsSectionProps) {
  const hasAny = incoming.length > 0 || outgoing.length > 0;

  if (!hasAny) return null;

  return (
    <div className={className}>
      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Inbox size={20} className="text-seeya-purple" />
            <h2 className="text-lg font-semibold text-seeya-text">Incoming Requests</h2>
            <span className="bg-seeya-purple text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {incoming.length}
            </span>
          </div>

          <div className="space-y-3">
            {incoming.map((request) => (
              <RequestCard
                key={request.id}
                profile={request.profile}
                type="incoming"
                onAccept={() => onAccept(request.id)}
                onDecline={() => onDecline(request.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Outgoing requests */}
      {outgoing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Send size={20} className="text-seeya-text-secondary" />
            <h2 className="text-lg font-semibold text-seeya-text">Sent Requests</h2>
            <span className="text-sm text-seeya-text-secondary">({outgoing.length})</span>
          </div>

          <div className="space-y-3">
            {outgoing.map((request) => (
              <RequestCard
                key={request.id}
                profile={request.profile}
                type="outgoing"
                onCancel={() => onCancel(request.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

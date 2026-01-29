'use client';

import { cn } from '@/lib/utils/cn';
import { Card, Avatar, Button, Badge } from '@/components/ui';
import { UserPlus, Crown, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { TripParticipant } from '@/types/database';

interface ParticipantsSectionProps {
  participants: TripParticipant[];
  onInviteClick?: () => void;
  className?: string;
}

const statusConfig = {
  accepted: { label: 'Confirmed', icon: CheckCircle2, color: 'text-seeya-success' },
  invited: { label: 'Pending', icon: Clock, color: 'text-seeya-warning' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-seeya-error' },
};

export function ParticipantsSection({
  participants,
  onInviteClick,
  className,
}: ParticipantsSectionProps) {
  const acceptedCount = participants.filter((p) => p.status === 'accepted').length;
  const pendingCount = participants.filter((p) => p.status === 'invited').length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-seeya-text">Travelers</h3>
          <p className="text-sm text-seeya-text-secondary">
            {acceptedCount} confirmed
            {pendingCount > 0 && `, ${pendingCount} pending`}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<UserPlus size={16} />}
          onClick={onInviteClick}
        >
          Invite
        </Button>
      </div>

      <Card variant="outline" padding="none">
        <div className="divide-y divide-gray-100">
          {participants.map((participant) => {
            const status = statusConfig[participant.status];
            const StatusIcon = status.icon;

            return (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-4"
              >
                <Avatar
                  name={participant.user?.full_name || 'Unknown'}
                  avatarUrl={participant.user?.avatar_url}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-seeya-text truncate">
                      {participant.user?.full_name || 'Unknown User'}
                    </p>
                    {participant.role === 'owner' && (
                      <Crown size={14} className="text-seeya-warning flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <StatusIcon size={12} className={status.color} />
                    <span className={cn('text-sm', status.color)}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {participants.length === 0 && (
          <div className="p-6 text-center text-seeya-text-secondary">
            <p className="mb-3">No travelers added yet</p>
            <Button
              variant="purple"
              size="sm"
              leftIcon={<UserPlus size={16} />}
              onClick={onInviteClick}
            >
              Invite Friends
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

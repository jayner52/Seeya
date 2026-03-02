'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, Avatar, Button } from '@/components/ui';
import { UserPlus, Crown, CheckCircle2, Clock, XCircle, MoreHorizontal, Loader2 } from 'lucide-react';
import type { TripParticipant } from '@/types/database';

interface ParticipantsSectionProps {
  participants: TripParticipant[];
  onInviteClick?: () => void;
  className?: string;
  isOwner?: boolean;
  ownerUserId?: string;
  tripId?: string;
  onParticipantsChanged?: () => void;
}

const statusConfig = {
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-seeya-success' },
  invited: { label: 'Pending', icon: Clock, color: 'text-seeya-warning' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-seeya-error' },
  maybe: { label: 'Maybe', icon: Clock, color: 'text-seeya-text-secondary' },
};

export function ParticipantsSection({
  participants,
  onInviteClick,
  className,
  isOwner,
  ownerUserId,
  tripId,
  onParticipantsChanged,
}: ParticipantsSectionProps) {
  const [localParticipants, setLocalParticipants] = useState(participants);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Sync local state when parent refreshes participants
  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  const confirmedCount = localParticipants.filter((p) => p.status === 'confirmed').length;
  const pendingCount = localParticipants.filter((p) => p.status === 'invited').length;
  const maybeCount = localParticipants.filter((p) => p.status === 'maybe').length;

  async function handleChangeStatus(participantId: string, newStatus: string) {
    // Optimistic update
    setLocalParticipants(prev =>
      prev.map(p => p.id === participantId ? { ...p, status: newStatus as TripParticipant['status'] } : p)
    );
    setLoadingId(participantId);
    setMenuOpenId(null);
    const res = await fetch(`/api/trips/${tripId}/participants/${participantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoadingId(null);
    if (!res.ok) {
      setLocalParticipants(participants); // revert
      return;
    }
    onParticipantsChanged?.();
  }

  async function handleRemove(participantId: string) {
    // Optimistic update
    setLocalParticipants(prev => prev.filter(p => p.id !== participantId));
    setLoadingId(participantId);
    setMenuOpenId(null);
    const res = await fetch(`/api/trips/${tripId}/participants/${participantId}`, {
      method: 'DELETE',
    });
    setLoadingId(null);
    if (!res.ok) {
      setLocalParticipants(participants); // revert
      return;
    }
    onParticipantsChanged?.();
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-seeya-text">Travelers</h3>
          <p className="text-sm text-seeya-text-secondary">
            {confirmedCount} confirmed
            {maybeCount > 0 && `, ${maybeCount} maybe`}
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
          {localParticipants.map((participant) => {
            const statusKey = participant.status as keyof typeof statusConfig;
            const status = statusConfig[statusKey] ?? statusConfig.invited;
            const StatusIcon = status.icon;
            const isThisOwner = participant.user_id === ownerUserId;
            const canManage = isOwner && !isThisOwner && tripId;
            const isLoading = loadingId === participant.id;

            return (
              <div key={participant.id} className="flex items-center gap-3 p-4">
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
                    {isThisOwner && (
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

                {/* Owner action menu */}
                {canManage && (
                  <div className="relative flex-shrink-0">
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin text-seeya-text-secondary" />
                    ) : (
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === participant.id ? null : participant.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-seeya-text-secondary"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    )}

                    {menuOpenId === participant.id && (
                      <>
                        {/* Click-outside overlay */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                          {participant.status !== 'confirmed' && (
                            <button
                              onClick={() => handleChangeStatus(participant.id, 'confirmed')}
                              className="w-full text-left px-4 py-2 text-sm text-seeya-text hover:bg-gray-50"
                            >
                              Mark Confirmed
                            </button>
                          )}
                          {participant.status !== 'maybe' && (
                            <button
                              onClick={() => handleChangeStatus(participant.id, 'maybe')}
                              className="w-full text-left px-4 py-2 text-sm text-seeya-text hover:bg-gray-50"
                            >
                              Mark Maybe
                            </button>
                          )}
                          {participant.status !== 'invited' && (
                            <button
                              onClick={() => handleChangeStatus(participant.id, 'invited')}
                              className="w-full text-left px-4 py-2 text-sm text-seeya-text hover:bg-gray-50"
                            >
                              Mark Pending
                            </button>
                          )}
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => handleRemove(participant.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                          >
                            Remove from Trip
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {localParticipants.length === 0 && (
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

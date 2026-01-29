'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Avatar, Button } from '@/components/ui';
import { Check, X, Clock } from 'lucide-react';
import type { Profile } from '@/types/database';

interface RequestCardProps {
  profile: Profile;
  type: 'incoming' | 'outgoing';
  onAccept?: () => Promise<void>;
  onDecline?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  className?: string;
}

export function RequestCard({
  profile,
  type,
  onAccept,
  onDecline,
  onCancel,
  className,
}: RequestCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleAccept = async () => {
    if (!onAccept) return;
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!onDecline) return;
    setIsDeclining(true);
    try {
      await onDecline();
    } finally {
      setIsDeclining(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setIsCancelling(true);
    try {
      await onCancel();
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white',
        className
      )}
    >
      <Avatar
        name={profile.full_name}
        avatarUrl={profile.avatar_url}
        size="lg"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-seeya-text truncate">
          {profile.full_name}
        </p>
        {type === 'incoming' ? (
          <p className="text-sm text-seeya-text-secondary">
            Wants to be your travel pal
          </p>
        ) : (
          <p className="text-sm text-seeya-text-secondary flex items-center gap-1">
            <Clock size={12} />
            Request pending
          </p>
        )}
      </div>

      {type === 'incoming' ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            isLoading={isDeclining}
            disabled={isAccepting}
            className="px-3"
          >
            <X size={16} />
          </Button>
          <Button
            variant="purple"
            size="sm"
            onClick={handleAccept}
            isLoading={isAccepting}
            disabled={isDeclining}
            leftIcon={<Check size={16} />}
          >
            Accept
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          isLoading={isCancelling}
          className="text-seeya-text-secondary"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function Avatar({
  name,
  avatarUrl,
  size = 'md',
  showBorder = false,
  className,
}: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex-shrink-0',
        sizes[size],
        showBorder && 'ring-2 ring-white',
        className
      )}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          fill
          className="object-cover"
          sizes={getSizePixels(size)}
        />
      ) : (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center',
            'bg-seeya-primary text-seeya-text font-medium'
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

interface StackedAvatarsProps {
  participants: Array<{
    id: string;
    user?: {
      full_name: string;
      avatar_url?: string | null;
    } | null;
  }>;
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function StackedAvatars({
  participants,
  maxVisible = 3,
  size = 'sm',
}: StackedAvatarsProps) {
  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = participants.length - maxVisible;

  const overlapMargin = {
    xs: '-ml-2',
    sm: '-ml-2.5',
    md: '-ml-3',
    lg: '-ml-4',
  };

  return (
    <div className="flex items-center">
      {visibleParticipants.map((participant, index) => (
        <div
          key={participant.id}
          className={cn(index > 0 && overlapMargin[size])}
          style={{ zIndex: maxVisible - index }}
        >
          <Avatar
            name={participant.user?.full_name || 'Unknown'}
            avatarUrl={participant.user?.avatar_url}
            size={size}
            showBorder
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            overlapMargin[size],
            sizes[size],
            'rounded-full flex items-center justify-center',
            'bg-gray-100 text-seeya-text-secondary font-medium',
            'ring-2 ring-white'
          )}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getSizePixels(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
  const pixelSizes = {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '48px',
    xl: '64px',
  };
  return pixelSizes[size];
}

'use client';

import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui';
import { ChevronRight, MapPin } from 'lucide-react';
import type { Profile } from '@/types/database';

interface TravelPalCardProps {
  profile: Profile;
  tripCount?: number;
  mutualTrips?: number;
  colorDot?: string;
  onClick?: () => void;
  className?: string;
}

export function TravelPalCard({
  profile,
  tripCount = 0,
  mutualTrips = 0,
  colorDot,
  onClick,
  className,
}: TravelPalCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all text-left',
        className
      )}
    >
      <div className="relative">
        <Avatar
          name={profile.full_name}
          avatarUrl={profile.avatar_url}
          size="lg"
        />
        {colorDot && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: colorDot }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-seeya-text truncate">
          {profile.full_name}
        </p>
        <div className="flex items-center gap-3 text-sm text-seeya-text-secondary">
          {tripCount > 0 && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {tripCount} {tripCount === 1 ? 'trip' : 'trips'}
            </span>
          )}
          {mutualTrips > 0 && (
            <span>{mutualTrips} together</span>
          )}
        </div>
      </div>
      <ChevronRight size={20} className="text-seeya-text-secondary flex-shrink-0" />
    </button>
  );
}

// Compact version for horizontal scroll
export function TravelPalCardCompact({
  profile,
  colorDot,
  onClick,
  className,
}: Omit<TravelPalCardProps, 'tripCount' | 'mutualTrips'>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors min-w-[80px]',
        className
      )}
    >
      <div className="relative">
        <Avatar
          name={profile.full_name}
          avatarUrl={profile.avatar_url}
          size="lg"
        />
        {colorDot && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: colorDot }}
          />
        )}
      </div>
      <p className="text-xs font-medium text-seeya-text text-center truncate w-full">
        {profile.full_name.split(' ')[0]}
      </p>
    </button>
  );
}

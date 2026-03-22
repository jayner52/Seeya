'use client';

import { useState, useEffect } from 'react';
import { Card, Avatar, StackedAvatars, Badge } from '@/components/ui';
import { formatDateRange, getDaysUntil } from '@/lib/utils/date';
import { getLocationDisplayName } from '@/types/database';
import type { TripWithDetails } from '@/types';
import {
  Calendar,
  Users,
  Plane,
  ChevronRight,
  UserCircle,
} from 'lucide-react';

interface InviterProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TripPreviewProps {
  trip: TripWithDetails;
  inviter?: InviterProfile | null;
  coverPhotoCity?: string | null;
  showParticipants?: boolean;
  showLocations?: boolean;
}

export function TripPreview({
  trip,
  inviter,
  coverPhotoCity,
  showParticipants = true,
  showLocations = true,
}: TripPreviewProps) {
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const daysUntil = getDaysUntil(trip.start_date);
  const acceptedParticipants = trip.participants.filter(
    (p) => p.status === 'confirmed'
  );

  useEffect(() => {
    if (!coverPhotoCity) return;
    fetch(`/api/unsplash/city-photo?city=${encodeURIComponent(coverPhotoCity)}`)
      .then(res => res.json())
      .then(data => { if (data.photoUrl) setCoverPhotoUrl(data.photoUrl); })
      .catch(() => {});
  }, [coverPhotoCity]);

  return (
    <Card variant="elevated" padding="none" className="animate-slide-up overflow-hidden">
      {/* Cover Photo */}
      {coverPhotoUrl && (
        <div className="relative h-40 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverPhotoUrl} alt={coverPhotoCity || 'Trip'} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      <div className="p-6">
      {/* Trip Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-2xl font-display font-medium text-seeya-text">
            {trip.name}
          </h2>
          {daysUntil !== null && daysUntil > 0 && (
            <Badge variant="purple" size="sm">
              In {daysUntil} days
            </Badge>
          )}
        </div>
        {trip.description && (
          <p className="text-seeya-text-secondary">{trip.description}</p>
        )}
      </div>

      {/* Trip Details */}
      <div className="space-y-4">
        {/* Dates */}
        {dateRange && (
          <div className="flex items-center gap-3 text-seeya-text">
            <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center">
              <Calendar className="text-seeya-purple" size={20} />
            </div>
            <div>
              <p className="text-sm text-seeya-text-secondary">Dates</p>
              <p className="font-medium">{dateRange}</p>
            </div>
          </div>
        )}

        {/* Locations */}
        {showLocations && trip.locations && trip.locations.length > 0 && (
          <div className="flex items-start gap-3 text-seeya-text">
            <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center flex-shrink-0">
              <Plane className="text-seeya-purple" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-seeya-text-secondary mb-2">
                Locations
              </p>
              <div className="space-y-2">
                {trip.locations.slice(0, 3).map((location, index) => (
                  <div key={location.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-seeya-text-secondary">
                      {index + 1}
                    </div>
                    <span className="font-medium">{getLocationDisplayName(location)}</span>
                    {location.city && (
                      <span className="text-seeya-text-secondary text-sm">
                        {location.city.country}
                      </span>
                    )}
                  </div>
                ))}
                {trip.locations.length > 3 && (
                  <p className="text-sm text-seeya-text-secondary flex items-center gap-1">
                    +{trip.locations.length - 3} more locations
                    <ChevronRight size={14} />
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Participants */}
        {showParticipants && acceptedParticipants.length > 0 && (
          <div className="flex items-center gap-3 text-seeya-text">
            <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center">
              <Users className="text-seeya-purple" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-seeya-text-secondary mb-2">
                Travelers ({acceptedParticipants.length})
              </p>
              <div className="flex items-center gap-3">
                <StackedAvatars
                  participants={acceptedParticipants}
                  maxVisible={5}
                  size="md"
                />
                {acceptedParticipants.length <= 3 && (
                  <div className="flex flex-wrap gap-1">
                    {acceptedParticipants.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="text-sm text-seeya-text-secondary"
                      >
                        {p.user?.full_name?.split(' ')[0]}
                        {p !==
                          acceptedParticipants[
                            Math.min(2, acceptedParticipants.length - 1)
                          ] && ','}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invited by */}
        {inviter && (
          <div className="flex items-center gap-3 text-seeya-text pt-2 border-t border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center flex-shrink-0">
              <UserCircle className="text-seeya-purple" size={20} />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Avatar
                avatarUrl={inviter.avatar_url}
                name={inviter.full_name || 'Someone'}
                size="sm"
              />
              <div>
                <p className="text-sm text-seeya-text-secondary">Invited by</p>
                <p className="font-medium">{inviter.full_name || 'Someone'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </Card>
  );
}

interface TripPreviewSkeletonProps {
  className?: string;
}

export function TripPreviewSkeleton({ className }: TripPreviewSkeletonProps) {
  return (
    <Card variant="elevated" padding="lg" className={className}>
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full mb-6" />

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-20 mb-1" />
                <div className="h-5 bg-gray-200 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

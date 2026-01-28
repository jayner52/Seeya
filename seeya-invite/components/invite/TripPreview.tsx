'use client';

import { Card, Avatar, StackedAvatars, Badge } from '@/components/ui';
import { formatDateRange, getDaysUntil } from '@/lib/utils/date';
import type { TripWithDetails } from '@/types';
import {
  MapPin,
  Calendar,
  Users,
  Plane,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface TripPreviewProps {
  trip: TripWithDetails;
  showParticipants?: boolean;
  showLocations?: boolean;
}

export function TripPreview({
  trip,
  showParticipants = true,
  showLocations = true,
}: TripPreviewProps) {
  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const daysUntil = getDaysUntil(trip.start_date);
  const acceptedParticipants = trip.participants.filter(
    (p) => p.status === 'accepted'
  );

  return (
    <Card variant="elevated" padding="lg" className="animate-slide-up">
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
                    <span className="font-medium">{location.name}</span>
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

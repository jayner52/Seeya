'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils/date';
import type { UpcomingTrip } from '@/types/calendar';

interface UpcomingTripCardProps {
  trip: UpcomingTrip;
}

export function UpcomingTripCard({ trip }: UpcomingTripCardProps) {
  const getDaysUntilLabel = () => {
    if (trip.days_until === 0) return 'Today';
    if (trip.days_until === 1) return 'Tomorrow';
    return `In ${trip.days_until} days`;
  };

  return (
    <Link href={`/trips/${trip.id}`}>
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
        {/* Emoji placeholder */}
        <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center text-lg flex-shrink-0">
          ✈️
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-seeya-text truncate">
              {trip.name}
            </h4>
            <Badge
              variant={trip.days_until <= 7 ? 'purple' : 'default'}
              size="sm"
              className="flex-shrink-0"
            >
              {getDaysUntilLabel()}
            </Badge>
          </div>

          {trip.destination && (
            <div className="flex items-center gap-1 text-xs text-seeya-text-secondary mt-0.5">
              <MapPin size={12} />
              <span className="truncate">{trip.destination}</span>
            </div>
          )}

          <div className="text-xs text-seeya-text-secondary mt-0.5">
            {formatDate(trip.start_date, 'MMM d, yyyy')}
          </div>
        </div>
      </div>
    </Link>
  );
}

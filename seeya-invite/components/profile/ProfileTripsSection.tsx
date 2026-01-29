'use client';

import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { Plane, ChevronRight, Calendar } from 'lucide-react';
import { formatDateRange, getDaysUntil } from '@/lib/utils/date';
import type { Trip } from '@/types/database';

interface ProfileTripsSectionProps {
  upcomingTrips: Trip[];
  pastTrips: Trip[];
  className?: string;
}

interface TripItemProps {
  trip: Trip;
}

function TripItem({ trip }: TripItemProps) {
  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const daysUntil = getDaysUntil(trip.start_date);
  const isPast = daysUntil !== null && daysUntil < 0;

  return (
    <Link href={`/trips/${trip.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center">
          <Plane size={18} className="text-seeya-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-seeya-text truncate">{trip.name}</p>
            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
              <Badge variant="purple" size="sm">
                {daysUntil === 0 ? 'Today' : `In ${daysUntil}d`}
              </Badge>
            )}
          </div>
          {dateRange && (
            <p className="text-sm text-seeya-text-secondary flex items-center gap-1">
              <Calendar size={12} />
              {dateRange}
            </p>
          )}
        </div>
        <ChevronRight size={18} className="text-seeya-text-secondary" />
      </div>
    </Link>
  );
}

export function ProfileTripsSection({
  upcomingTrips,
  pastTrips,
  className,
}: ProfileTripsSectionProps) {
  const hasTrips = upcomingTrips.length > 0 || pastTrips.length > 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plane size={20} className="text-seeya-purple" />
          <h2 className="text-lg font-semibold text-seeya-text">My Trips</h2>
        </div>
        <Link href="/trips">
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </div>

      {hasTrips ? (
        <Card variant="outline" padding="none">
          {/* Upcoming */}
          {upcomingTrips.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-medium text-seeya-text-secondary uppercase tracking-wide mb-2">
                Upcoming
              </p>
              <div className="space-y-1">
                {upcomingTrips.slice(0, 3).map((trip) => (
                  <TripItem key={trip.id} trip={trip} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {pastTrips.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-medium text-seeya-text-secondary uppercase tracking-wide mb-2">
                Past
              </p>
              <div className="space-y-1">
                {pastTrips.slice(0, 3).map((trip) => (
                  <TripItem key={trip.id} trip={trip} />
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card variant="outline" padding="lg" className="text-center">
          <p className="text-seeya-text-secondary mb-3">No trips yet</p>
          <Link href="/trips/new">
            <Button variant="purple" size="sm">
              Create Your First Trip
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

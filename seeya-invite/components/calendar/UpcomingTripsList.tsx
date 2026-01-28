'use client';

import type { UpcomingTrip } from '@/types/calendar';
import { UpcomingTripCard } from './UpcomingTripCard';

interface UpcomingTripsListProps {
  trips: UpcomingTrip[];
}

export function UpcomingTripsList({ trips }: UpcomingTripsListProps) {
  if (trips.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-seeya-text mb-2">Upcoming Trips</h3>
        <p className="text-sm text-seeya-text-secondary">
          No upcoming trips. Start planning your next adventure!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-seeya-text">Upcoming Trips</h3>
      </div>

      {/* Trip list */}
      <div className="divide-y divide-gray-100">
        {trips.map((trip) => (
          <UpcomingTripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  );
}

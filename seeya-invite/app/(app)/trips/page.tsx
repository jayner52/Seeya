'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Spinner } from '@/components/ui';
import { formatDateRange } from '@/lib/utils/date';
import { Plus, MapPin, Calendar, Briefcase, Clock } from 'lucide-react';
import type { TripParticipant } from '@/types';
import { transformParticipant } from '@/types/database';

interface TripLocation {
  id: string;
  custom_location: string | null;
  order_index: number;
}

interface TripWithParticipants {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  participants: TripParticipant[];
  locations: TripLocation[];
}

export default function TripsPage() {
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<TripWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchTrips() {
      const supabase = createClient();

      // Get trips where user is a participant
      const { data: participations } = await supabase
        .from('trip_participants')
        .select('trip_id')
        .eq('user_id', user!.id)
        .eq('status', 'accepted');

      const participantTripIds = participations?.map((p) => p.trip_id) || [];

      // Get trips where user is the owner (user_id in trips table)
      const { data: ownedTrips } = await supabase
        .from('trips')
        .select('id')
        .eq('user_id', user!.id);

      const ownedTripIds = ownedTrips?.map((t) => t.id) || [];

      // Combine and deduplicate trip IDs
      const allTripIds = Array.from(new Set([...participantTripIds, ...ownedTripIds]));

      if (allTripIds.length === 0) {
        setTrips([]);
        setIsLoading(false);
        return;
      }

      // Get trip details
      const { data: tripsData } = await supabase
        .from('trips')
        .select(`
          id,
          name,
          description,
          start_date,
          end_date
        `)
        .in('id', allTripIds)
        .order('start_date', { ascending: true });

      if (!tripsData) {
        setTrips([]);
        setIsLoading(false);
        return;
      }

      // Get participants for all trips
      const { data: allParticipants } = await supabase
        .from('trip_participants')
        .select(`
          id,
          trip_id,
          user_id,
          role,
          status,
          joined_at,
          created_at,
          user:profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .in('trip_id', allTripIds)
        .eq('status', 'accepted');

      // Get locations for all trips
      const { data: allLocations } = await supabase
        .from('trip_locations')
        .select('id, trip_id, custom_location, order_index')
        .in('trip_id', allTripIds)
        .order('order_index');

      // Combine data
      const tripsWithParticipants = tripsData.map((trip) => ({
        ...trip,
        participants:
          (allParticipants?.filter((p) => p.trip_id === trip.id) || []).map(transformParticipant),
        locations:
          allLocations?.filter((l) => l.trip_id === trip.id) || [],
      }));

      setTrips(tripsWithParticipants);
      setIsLoading(false);
    }

    fetchTrips();
  }, [user]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-seeya-text">
            My Trips
          </h1>
          <p className="text-seeya-text-secondary mt-1">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
          </p>
        </div>
        <Link href="/trips/new">
          <Button variant="primary" leftIcon={<Plus size={20} />}>
            New Trip
          </Button>
        </Link>
      </div>

      {/* Trips List */}
      {trips.length === 0 ? (
        <Card variant="elevated" padding="lg" className="text-center py-16">
          <div className="text-6xl mb-4">🌍</div>
          <h2 className="text-xl font-semibold text-seeya-text mb-2">
            No trips yet
          </h2>
          <p className="text-seeya-text-secondary mb-6 max-w-md mx-auto">
            Start planning your next adventure! Create a trip and invite your
            friends to join.
          </p>
          <Link href="/trips/new">
            <Button variant="purple" leftIcon={<Plus size={20} />}>
              Create Your First Trip
            </Button>
          </Link>
        </Card>
      ) : (
        <TripsListByStatus trips={trips} />
      )}
    </div>
  );
}

function TripsListByStatus({ trips }: { trips: TripWithParticipants[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTrips = trips.filter((trip) => {
    if (!trip.start_date) return true; // No date = treat as upcoming
    const startDate = new Date(trip.start_date);
    return startDate >= today;
  });

  const pastTrips = trips.filter((trip) => {
    if (!trip.start_date) return false;
    const startDate = new Date(trip.start_date);
    return startDate < today;
  });

  return (
    <div className="space-y-8">
      {/* Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={20} className="text-seeya-purple" />
            <h2 className="text-lg font-semibold text-seeya-text">
              Upcoming Trips
            </h2>
            <span className="text-seeya-text-secondary">({upcomingTrips.length})</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
            {upcomingTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}

      {/* Past Trips */}
      {pastTrips.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-seeya-text-secondary" />
            <h2 className="text-lg font-semibold text-seeya-text">
              Past Trips
            </h2>
            <span className="text-seeya-text-secondary">({pastTrips.length})</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
            {pastTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TripCard({ trip }: { trip: TripWithParticipants }) {
  const dateRange = formatDateRange(trip.start_date, trip.end_date);

  // Get location display string
  const firstLocation = trip.locations[0]?.custom_location;
  const locationCount = trip.locations.length;
  const locationDisplay = firstLocation
    ? locationCount > 1
      ? `${firstLocation} +${locationCount - 1} more`
      : firstLocation
    : null;

  return (
    <Link href={`/trips/${trip.id}`} className="h-full">
      <Card
        variant="elevated"
        padding="none"
        className="overflow-hidden hover:shadow-seeya-lg transition-shadow cursor-pointer h-full flex flex-col"
      >
        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          {/* Title - fixed 2 lines height */}
          <h3 className="font-semibold text-seeya-text mb-2 line-clamp-2 min-h-[2.75rem]">
            {trip.name}
          </h3>

          {/* Location - always show row even if empty */}
          <div className="flex items-center gap-1.5 text-sm text-seeya-text-secondary mb-1 h-5">
            {locationDisplay && (
              <>
                <MapPin size={14} className="flex-shrink-0" />
                <span className="truncate">{locationDisplay}</span>
              </>
            )}
          </div>

          {/* Dates - always show row even if empty */}
          <div className="flex items-center gap-1.5 text-sm text-seeya-text-secondary h-5">
            {dateRange && (
              <>
                <Calendar size={14} className="flex-shrink-0" />
                <span>{dateRange}</span>
              </>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

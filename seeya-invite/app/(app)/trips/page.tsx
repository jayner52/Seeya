'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Badge, StackedAvatars, Spinner } from '@/components/ui';
import { formatDateRange, getDaysUntil } from '@/lib/utils/date';
import { Plus, MapPin, Calendar, ChevronRight } from 'lucide-react';
import type { TripParticipant } from '@/types';
import { transformParticipant } from '@/types/database';

interface TripWithParticipants {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  participants: TripParticipant[];
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

      if (!participations || participations.length === 0) {
        setTrips([]);
        setIsLoading(false);
        return;
      }

      const tripIds = participations.map((p) => p.trip_id);

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
        .in('id', tripIds)
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
        .in('trip_id', tripIds)
        .eq('status', 'accepted');

      // Combine data
      const tripsWithParticipants = tripsData.map((trip) => ({
        ...trip,
        participants:
          (allParticipants?.filter((p) => p.trip_id === trip.id) || []).map(transformParticipant),
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
        <Button variant="purple" leftIcon={<Plus size={20} />}>
          New Trip
        </Button>
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
          <Button variant="purple" leftIcon={<Plus size={20} />}>
            Create Your First Trip
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}

function TripCard({ trip }: { trip: TripWithParticipants }) {
  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const daysUntil = getDaysUntil(trip.start_date);

  return (
    <Link href={`/trips/${trip.id}`}>
      <Card
        variant="elevated"
        padding="none"
        className="overflow-hidden hover:shadow-seeya-lg transition-shadow cursor-pointer"
      >
        {/* Header with gradient */}
        <div className="h-24 bg-gradient-to-br from-seeya-purple to-purple-600 relative">
          {daysUntil !== null && daysUntil > 0 && (
            <Badge
              variant="default"
              size="sm"
              className="absolute top-3 right-3 bg-white/90 text-seeya-purple"
            >
              In {daysUntil} days
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg text-seeya-text mb-1">
            {trip.name}
          </h3>

          {dateRange && (
            <div className="flex items-center gap-1.5 text-sm text-seeya-text-secondary mb-4">
              <Calendar size={14} />
              <span>{dateRange}</span>
            </div>
          )}

          {/* Participants */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <StackedAvatars participants={trip.participants} maxVisible={4} />
            <ChevronRight size={20} className="text-seeya-text-secondary" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

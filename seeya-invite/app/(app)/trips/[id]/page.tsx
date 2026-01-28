'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Badge,
  Avatar,
  StackedAvatars,
  Spinner,
} from '@/components/ui';
import { formatDateRange, getDaysUntil, formatDate } from '@/lib/utils/date';
import {
  MapPin,
  Calendar,
  Users,
  Share2,
  Plus,
  Plane,
  Hotel,
  Utensils,
  Ticket,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import type { TripWithDetails, TripBit } from '@/types';

const categoryIcons: Record<string, typeof Plane> = {
  flight: Plane,
  hotel: Hotel,
  restaurant: Utensils,
  activity: Ticket,
  transport: MapPin,
};

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params?.id as string;
  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [tripbits, setTripbits] = useState<TripBit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrip() {
      const supabase = createClient();

      // Get trip
      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (!tripData) {
        setIsLoading(false);
        return;
      }

      // Get locations
      const { data: locations } = await supabase
        .from('trip_locations')
        .select(`
          *,
          city:cities (id, name, country, country_code, continent)
        `)
        .eq('trip_id', tripId)
        .order('order_index');

      // Get participants
      const { data: participants } = await supabase
        .from('trip_participants')
        .select(`
          *,
          user:profiles (id, full_name, avatar_url)
        `)
        .eq('trip_id', tripId)
        .eq('status', 'accepted');

      // Get tripbits
      const { data: bits } = await supabase
        .from('tripbits')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: true });

      setTrip({
        ...tripData,
        locations: locations || [],
        participants: participants || [],
      });
      setTripbits(bits || []);
      setIsLoading(false);
    }

    fetchTrip();
  }, [tripId]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-6">
        <Card variant="elevated" padding="lg" className="text-center">
          <h2 className="text-xl font-semibold text-seeya-text mb-2">
            Trip not found
          </h2>
          <p className="text-seeya-text-secondary mb-4">
            This trip doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link href="/trips">
            <Button variant="primary">Back to Trips</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const daysUntil = getDaysUntil(trip.start_date);
  const acceptedParticipants = trip.participants.filter(
    (p) => p.status === 'accepted'
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-seeya-purple to-purple-700 text-white">
        <div className="p-6">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Trips</span>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-display font-semibold">
                  {trip.name}
                </h1>
                {daysUntil !== null && daysUntil > 0 && (
                  <Badge
                    variant="default"
                    className="bg-white/20 text-white border-0"
                  >
                    In {daysUntil} days
                  </Badge>
                )}
              </div>

              {dateRange && (
                <div className="flex items-center gap-2 text-white/80">
                  <Calendar size={16} />
                  <span>{dateRange}</span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/10"
              leftIcon={<Share2 size={16} />}
            >
              Share
            </Button>
          </div>

          {/* Travelers */}
          <div className="mt-6 flex items-center gap-4">
            <StackedAvatars
              participants={acceptedParticipants}
              maxVisible={5}
              size="md"
            />
            <span className="text-white/80 text-sm">
              {acceptedParticipants.length} travelers
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Locations */}
        {trip.locations.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-seeya-text flex items-center gap-2">
                <MapPin className="text-seeya-purple" size={20} />
                Destinations
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {trip.locations.map((location, index) => (
                <Card
                  key={location.id}
                  variant="outline"
                  padding="md"
                  className="flex-shrink-0 min-w-[200px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-seeya-purple/10 flex items-center justify-center text-sm font-medium text-seeya-purple">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-seeya-text">
                        {location.name}
                      </p>
                      {location.city && (
                        <p className="text-sm text-seeya-text-secondary">
                          {location.city.country}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* TripBits / Itinerary */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-seeya-text flex items-center gap-2">
              <Calendar className="text-seeya-purple" size={20} />
              Itinerary
            </h2>
            <Button variant="secondary" size="sm" leftIcon={<Plus size={16} />}>
              Add
            </Button>
          </div>

          {tripbits.length === 0 ? (
            <Card
              variant="outline"
              padding="lg"
              className="text-center text-seeya-text-secondary"
            >
              <p className="mb-4">No plans added yet</p>
              <Button variant="purple" size="sm" leftIcon={<Plus size={16} />}>
                Add Your First Plan
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {tripbits.map((bit) => {
                const Icon = categoryIcons[bit.category] || Ticket;
                return (
                  <Card key={bit.id} variant="outline" padding="md">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center">
                        <Icon className="text-seeya-purple" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-seeya-text truncate">
                          {bit.title}
                        </p>
                        {bit.date && (
                          <p className="text-sm text-seeya-text-secondary">
                            {formatDate(bit.date, 'EEE, MMM d')}
                            {bit.time && ` at ${bit.time}`}
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-seeya-text-secondary"
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

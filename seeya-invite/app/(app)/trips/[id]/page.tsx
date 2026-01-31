'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  Card,
  Button,
  Badge,
  StackedAvatars,
  Spinner,
} from '@/components/ui';
import {
  TripTabNav,
  PlanningTab,
  ItineraryTab,
  AddTripBitSheet,
  AIQuickAddSheet,
} from '@/components/trips';
import type { TripTab } from '@/components/trips';
import { formatDateRange, getDaysUntil } from '@/lib/utils/date';
import {
  MapPin,
  Calendar,
  Settings,
  ArrowLeft,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';
import type { TripWithDetails, TripBit, TripBitCategory, TripInviteLink } from '@/types';
import { getLocationDisplayName } from '@/types/database';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const tripId = params?.id as string;

  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [tripbits, setTripbits] = useState<TripBit[]>([]);
  const [inviteLink, setInviteLink] = useState<TripInviteLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TripTab>('planning');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addSheetCategory, setAddSheetCategory] = useState<TripBitCategory | undefined>();
  const [showMenu, setShowMenu] = useState(false);
  const [showAISheet, setShowAISheet] = useState(false);

  const fetchTrip = useCallback(async () => {
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

    // Get locations - query without city join first, then try to get city data
    // This handles cases where iOS set city_id but the city might not exist in web's cities table
    const { data: locationsRaw } = await supabase
      .from('trip_locations')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index');

    // Try to get city data for locations that have city_id
    let locations = locationsRaw || [];
    if (locations.length > 0) {
      const cityIds = locations
        .filter(l => l.city_id)
        .map(l => l.city_id);

      if (cityIds.length > 0) {
        const { data: cities } = await supabase
          .from('cities')
          .select('id, name, country, country_code, continent')
          .in('id', cityIds);

        // Attach city data to locations
        if (cities) {
          const cityMap = new Map(cities.map(c => [c.id, c]));
          locations = locations.map(l => ({
            ...l,
            city: l.city_id ? cityMap.get(l.city_id) : undefined
          }));
        }
      }
    }

    // Get participants (all statuses) - query without join first, then get profile data
    const { data: participantsRaw } = await supabase
      .from('trip_participants')
      .select('*')
      .eq('trip_id', tripId);

    // Get profile data for participants
    let participants = participantsRaw || [];
    if (participants.length > 0) {
      const userIds = participants.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profiles) {
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        participants = participants.map(p => ({
          ...p,
          user: profileMap.get(p.user_id)
        }));
      }
    }

    // Get tripbits
    const { data: bits } = await supabase
      .from('trip_bits')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    // Get existing invite link
    const { data: invite } = await supabase
      .from('trip_invite_links')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setTrip({
      ...tripData,
      locations: locations || [],
      participants: participants || [],
    });
    setTripbits(bits || []);
    setInviteLink(invite);
    setIsLoading(false);
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const handleAddTripBit = (category?: TripBitCategory) => {
    setAddSheetCategory(category);
    setShowAddSheet(true);
  };

  const handleTripBitClick = (tripBit: TripBit) => {
    // TODO: Open trip bit detail modal
    console.log('View trip bit:', tripBit);
  };

  const handleInviteClick = () => {
    // Switch to planning tab if on itinerary
    setActiveTab('planning');
    // Scroll to invite section (optional enhancement)
  };

  const isOwner = trip?.user_id === user?.id;

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
  // Total travelers = owner (1) + accepted participants (matching iOS behavior)
  const totalTravelers = 1 + acceptedParticipants.length;
  const firstLocation = trip.locations[0];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-seeya-purple to-purple-700 text-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white"
            >
              <ArrowLeft size={20} />
              <span>Back to Trips</span>
            </Link>

            {/* Menu */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <MoreHorizontal size={20} />
                </button>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowAISheet(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 w-full text-left text-seeya-text hover:bg-gray-50"
                      >
                        <Sparkles size={16} className="text-seeya-purple" />
                        <span>AI Quick Add</span>
                      </button>
                      <Link
                        href={`/trips/${tripId}/edit`}
                        className="flex items-center gap-2 px-4 py-2 text-seeya-text hover:bg-gray-50"
                        onClick={() => setShowMenu(false)}
                      >
                        <Settings size={16} />
                        <span>Edit Trip</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

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
                {daysUntil !== null && daysUntil === 0 && (
                  <Badge
                    variant="default"
                    className="bg-seeya-success text-white border-0"
                  >
                    Today!
                  </Badge>
                )}
              </div>

              {/* Location */}
              {firstLocation && (
                <div className="flex items-center gap-2 text-white/80 mb-1">
                  <MapPin size={16} />
                  <span>
                    {getLocationDisplayName(firstLocation)}
                    {trip.locations.length > 1 &&
                      ` +${trip.locations.length - 1} more`}
                  </span>
                </div>
              )}

              {/* Dates */}
              {dateRange && (
                <div className="flex items-center gap-2 text-white/80">
                  <Calendar size={16} />
                  <span>{dateRange}</span>
                </div>
              )}
            </div>
          </div>

          {/* Travelers */}
          <div className="mt-6 flex items-center gap-4">
            <StackedAvatars
              participants={acceptedParticipants}
              maxVisible={5}
              size="md"
            />
            <span className="text-white/80 text-sm">
              {totalTravelers}{' '}
              {totalTravelers === 1 ? 'traveler' : 'travelers'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <TripTabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="max-w-md"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'planning' ? (
          <PlanningTab
            tripId={tripId}
            tripBits={tripbits}
            participants={trip.participants}
            existingInviteCode={inviteLink?.code}
            locations={trip.locations}
            startDate={trip.start_date}
            endDate={trip.end_date}
            onAddTripBit={handleAddTripBit}
            onTripBitClick={handleTripBitClick}
            onInviteClick={handleInviteClick}
            onTripBitAdded={fetchTrip}
          />
        ) : (
          <ItineraryTab
            tripBits={tripbits}
            startDate={trip.start_date}
            endDate={trip.end_date}
            onTripBitClick={handleTripBitClick}
            onAddClick={() => handleAddTripBit()}
          />
        )}
      </div>

      {/* Add Trip Bit Sheet */}
      <AddTripBitSheet
        tripId={tripId}
        participants={trip.participants}
        initialCategory={addSheetCategory}
        isOpen={showAddSheet}
        onClose={() => {
          setShowAddSheet(false);
          setAddSheetCategory(undefined);
        }}
        onSuccess={() => {
          setShowAddSheet(false);
          setAddSheetCategory(undefined);
          fetchTrip(); // Refresh data
        }}
      />

      {/* AI Quick Add Sheet */}
      <AIQuickAddSheet
        tripId={tripId}
        participants={trip.participants}
        isOpen={showAISheet}
        onClose={() => setShowAISheet(false)}
        onSuccess={() => {
          setShowAISheet(false);
          fetchTrip(); // Refresh data
        }}
      />
    </div>
  );
}

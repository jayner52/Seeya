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
  InviteSection,
} from '@/components/trips';
import { PublishItineraryModal } from '@/components/trips/PublishItineraryModal';
import { TripRouteMap } from '@/components/trips/TripRouteMap';
import type { TripTab } from '@/components/trips';
import { formatDateRange, getDaysUntil } from '@/lib/utils/date';
import {
  MapPin,
  Calendar,
  Settings,
  ArrowLeft,
  MoreHorizontal,
  Sparkles,
  Download,
  Printer,
  Globe,
  X,
  ChevronDown,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import type { TripWithDetails, TripBit, TripBitCategory, TripInviteLink } from '@/types';
import type { AIRecommendation } from '@/types';
import type { TripBitAttachment } from '@/types/database';
import { mapCategoryToTripBitCategory, buildNotesFromRecommendation } from '@/lib/api/recommendations';
import { getLocationDisplayName } from '@/types/database';
import { generateTripICS, downloadICS, generateTripFilename } from '@/lib/utils/calendarExport';
import { printTripItinerary } from '@/lib/utils/pdfExport';
import { CITY_COLORS } from '@/lib/utils/tripColors';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils/cn';

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
  const [editingTripBit, setEditingTripBit] = useState<TripBit | null>(null);
  const [editingAttachments, setEditingAttachments] = useState<TripBitAttachment[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showAISheet, setShowAISheet] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLocationDates, setShowLocationDates] = useState(false);
  const [recommendationPreset, setRecommendationPreset] = useState<{
    initialTitle: string;
    initialNotes: string;
    initialCategory: TripBitCategory;
    locationDateRange?: { start: string; end: string; locationName?: string };
    onAdded: () => void;
  } | null>(null);

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
          .select('id, name, latitude, longitude, country:countries (name, code, continent)')
          .in('id', cityIds);

        // Attach city data to locations with flattened country info
        if (cities) {
          const cityMap = new Map(cities.map((c: any) => [c.id, {
            id: c.id,
            name: c.name,
            latitude: c.latitude,
            longitude: c.longitude,
            country: c.country?.name,
            country_code: c.country?.code,
            continent: c.country?.continent,
          }]));
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

    // Ensure owner always appears in participant list (fallback for older trips)
    const ownerInList = participants.some(p => p.user_id === tripData.user_id);
    if (!ownerInList) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', tripData.user_id)
        .single();

      if (ownerProfile) {
        participants.unshift({
          id: `owner-${tripData.user_id}`,
          trip_id: tripId,
          user_id: tripData.user_id,
          status: 'confirmed',
          role: 'owner',
          invited_by: null,
          created_at: tripData.created_at,
          user: ownerProfile,
        } as any);
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
    setEditingTripBit(null);
    setEditingAttachments([]);
    setAddSheetCategory(category);
    setShowAddSheet(true);
  };

  const handleTripBitClick = (tripBit: TripBit) => {
    // Open immediately for instant feedback
    setRecommendationPreset(null);
    setEditingTripBit(tripBit);
    setEditingAttachments([]);
    setAddSheetCategory(undefined);
    setShowAddSheet(true);

    // Fetch attachments in background and update when ready
    const supabase = createClient();
    supabase
      .from('trip_bit_attachments')
      .select('*')
      .eq('trip_bit_id', tripBit.id)
      .then(({ data }) => {
        if (data && data.length > 0) setEditingAttachments(data);
      });
  };

  const handleAddFromRecommendation = (
    recommendation: AIRecommendation,
    locationDateRange: { start: string; end: string; locationName?: string } | undefined,
    onAdded: () => void
  ) => {
    setRecommendationPreset({
      initialTitle: recommendation.title,
      initialNotes: buildNotesFromRecommendation(recommendation),
      initialCategory: mapCategoryToTripBitCategory(recommendation.category),
      locationDateRange,
      onAdded,
    });
    setEditingTripBit(null);
    setEditingAttachments([]);
    setAddSheetCategory(mapCategoryToTripBitCategory(recommendation.category));
    setShowAddSheet(true);
  };

  const handleInviteClick = () => {
    setShowInviteModal(true);
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
    (p) => p.status === 'confirmed'
  );
  // Count travelers — owner is usually a confirmed participant; avoid double-counting
  const ownerIsParticipant = trip.participants.some(
    p => p.user_id === trip.user_id && p.status === 'confirmed'
  );
  const totalTravelers = ownerIsParticipant
    ? acceptedParticipants.length
    : 1 + acceptedParticipants.length;
  const firstLocation = trip.locations[0];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-seeya-purple to-purple-700 text-white flex">
        {/* Left column: nav + trip info */}
        <div className="flex-1 min-w-0 flex flex-col px-6 pt-6 pb-6">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 self-start"
          >
            <ArrowLeft size={20} />
            <span>Back to Trips</span>
          </Link>

          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {isOwner ? (
              <button
                onClick={() => router.push(`/trips/${tripId}/edit`)}
                className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-2 -mx-2 py-1 -my-1 transition-colors group"
              >
                <h1 className="text-2xl md:text-3xl font-display font-semibold">
                  {trip.name}
                </h1>
                <ChevronRight size={16} className="text-white/40 group-hover:text-white/70 transition-colors flex-shrink-0" />
              </button>
            ) : (
              <h1 className="text-2xl md:text-3xl font-display font-semibold">
                {trip.name}
              </h1>
            )}
            {daysUntil !== null && daysUntil > 0 && (
              <Badge variant="default" className="bg-white/20 text-white border-0">
                In {daysUntil} days
              </Badge>
            )}
            {daysUntil !== null && daysUntil === 0 && (
              <Badge variant="default" className="bg-seeya-success text-white border-0">
                Today!
              </Badge>
            )}
          </div>

          {trip.locations.length > 0 && (
            <div className="mb-1">
              <div className="relative">
                <button
                  onClick={() => setShowLocationDates(v => !v)}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-left"
                >
                  <MapPin size={16} className="flex-shrink-0" />
                  <span>{trip.locations.map(l => getLocationDisplayName(l)).join(' → ')}</span>
                  {trip.locations.some(l => l.arrival_date) && (
                    <ChevronDown size={14} className={cn('transition-transform', showLocationDates && 'rotate-180')} />
                  )}
                </button>

                {showLocationDates && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowLocationDates(false)} />
                    <div className="absolute left-0 top-full mt-2 z-20 bg-white rounded-xl shadow-xl p-3 min-w-[220px] flex flex-col gap-2.5">
                      {trip.locations.map((loc, i) => {
                        const color = CITY_COLORS[i % CITY_COLORS.length];
                        return (
                          <div key={loc.id} className="flex items-center gap-3">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color.hex }}
                            />
                            <div>
                              <p className="text-sm font-medium text-seeya-text">{getLocationDisplayName(loc)}</p>
                              {loc.arrival_date && loc.departure_date && (
                                <p className="text-xs text-seeya-text-secondary">
                                  {format(new Date(loc.arrival_date.split(' ')[0] + 'T00:00:00'), 'MMM d')} –{' '}
                                  {format(new Date(loc.departure_date.split(' ')[0] + 'T00:00:00'), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {isOwner && (
                        <>
                          <div className="border-t border-gray-100 -mx-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLocationDates(false);
                              router.push(`/trips/${tripId}/edit`);
                            }}
                            className="flex items-center gap-2 text-sm text-seeya-purple hover:bg-purple-50 rounded-lg px-1 py-1 -mx-1 transition-colors"
                          >
                            <Pencil size={14} />
                            <span>Edit dates & locations</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {dateRange && (
            isOwner ? (
              <button
                onClick={() => router.push(`/trips/${tripId}/edit`)}
                className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg px-2 -mx-2 py-1 mb-4 transition-colors group"
              >
                <Calendar size={16} />
                <span>{dateRange}</span>
                <ChevronRight size={14} className="text-white/40 group-hover:text-white/70 transition-colors" />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-white/80 mb-4">
                <Calendar size={16} />
                <span>{dateRange}</span>
              </div>
            )
          )}

          <div className="flex items-center gap-3 mt-auto">
            <StackedAvatars participants={acceptedParticipants} maxVisible={5} size="md" />
            <div>
              <div className="text-white text-sm font-medium">
                {acceptedParticipants.length > 0
                  ? acceptedParticipants
                      .map(p => p.user?.full_name?.split(' ')[0] || 'Traveler')
                      .join(', ')
                  : 'Just you'}
              </div>
              <div className="text-white/60 text-xs">
                {totalTravelers} {totalTravelers === 1 ? 'traveler' : 'travelers'}
              </div>
            </div>
          </div>
        </div>

        {/* Map column — fills full height of header, scales with container */}
        {trip.locations.length > 0 && (
          <div className="relative w-[45%] min-w-0 hidden md:block">
            <div className="absolute inset-0 my-2 rounded-2xl overflow-hidden">
              <TripRouteMap locations={trip.locations} />
            </div>
          </div>
        )}

        {/* ... menu button column */}
        {isOwner && (
          <div className="flex-shrink-0 px-3 pt-4 flex flex-col">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <MoreHorizontal size={20} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                    <button
                      onClick={() => { setShowMenu(false); setShowAISheet(true); }}
                      className="flex items-center gap-2 px-4 py-2 w-full text-left text-seeya-text hover:bg-gray-50"
                    >
                      <Sparkles size={16} className="text-seeya-purple" />
                      <span>AI Quick Add</span>
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); router.push(`/trips/${tripId}/edit`); }}
                      className="flex items-center gap-2 px-4 py-2 w-full text-left text-seeya-text hover:bg-gray-50"
                    >
                      <Settings size={16} />
                      <span>Edit Trip</span>
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); setShowPublishModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 w-full text-left text-seeya-text hover:bg-gray-50"
                    >
                      <Globe size={16} className="text-seeya-purple" />
                      <span>Publish Itinerary</span>
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (trip) {
                          const ics = generateTripICS(trip, trip.locations, tripbits);
                          const filename = generateTripFilename(trip.name, trip.start_date);
                          downloadICS(ics, filename);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 w-full text-left text-seeya-text hover:bg-gray-50"
                    >
                      <Download size={16} className="text-seeya-purple" />
                      <span>Export Calendar (.ics)</span>
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); printTripItinerary(); }}
                      className="flex items-center gap-2 px-4 py-2 w-full text-left text-seeya-text hover:bg-gray-50"
                    >
                      <Printer size={16} className="text-seeya-purple" />
                      <span>Print Itinerary</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
            tripName={trip.name}
            tripBits={tripbits}
            participants={trip.participants}
            existingInviteCode={inviteLink?.code}
            locations={trip.locations}
            startDate={trip.start_date}
            endDate={trip.end_date}
            onAddTripBit={handleAddTripBit}
            onTripBitClick={handleTripBitClick}
            onInviteClick={handleInviteClick}
            onAIQuickAdd={() => setShowAISheet(true)}
            onTripBitAdded={fetchTrip}
            onAddRecommendation={handleAddFromRecommendation}
            isOwner={isOwner}
            ownerUserId={trip.user_id}
            currentUserId={user?.id}
            onParticipantsChanged={fetchTrip}
          />
        ) : (
          <ItineraryTab
            tripBits={tripbits}
            startDate={trip.start_date}
            endDate={trip.end_date}
            onTripBitClick={handleTripBitClick}
            onAddClick={() => handleAddTripBit()}
            onEditLocations={isOwner ? () => router.push(`/trips/${tripId}/edit`) : undefined}
            locations={trip.locations}
          />
        )}
      </div>

      {/* Add/Edit Trip Bit Sheet */}
      <AddTripBitSheet
        key={editingTripBit ? `edit-${editingTripBit.id}` : `add-${addSheetCategory ?? 'none'}`}
        tripId={tripId}
        participants={trip.participants}
        initialCategory={addSheetCategory}
        tripBit={editingTripBit}
        existingAttachments={editingAttachments}
        isOpen={showAddSheet}
        initialTitle={recommendationPreset?.initialTitle}
        initialNotes={recommendationPreset?.initialNotes}
        locationDateRange={recommendationPreset?.locationDateRange}
        tripDateRange={trip.start_date && trip.end_date ? { start: trip.start_date, end: trip.end_date } : undefined}
        onClose={() => {
          setShowAddSheet(false);
          setAddSheetCategory(undefined);
          setEditingTripBit(null);
          setEditingAttachments([]);
          setRecommendationPreset(null);
        }}
        onSuccess={() => {
          recommendationPreset?.onAdded();
          setShowAddSheet(false);
          setAddSheetCategory(undefined);
          setEditingTripBit(null);
          setEditingAttachments([]);
          setRecommendationPreset(null);
          fetchTrip();
        }}
        onDelete={() => {
          setShowAddSheet(false);
          setEditingTripBit(null);
          setEditingAttachments([]);
          setRecommendationPreset(null);
          fetchTrip();
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

      {/* Publish Itinerary Modal */}
      {showPublishModal && (
        <PublishItineraryModal
          tripId={tripId}
          tripBits={tripbits}
          tripDestination={firstLocation ? (firstLocation.city?.name || firstLocation.name || '') : ''}
          onClose={() => setShowPublishModal(false)}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-seeya-text">Invite Friends</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-seeya-text-secondary" />
              </button>
            </div>
            <div className="p-6">
              <InviteSection
                tripId={tripId}
                existingCode={inviteLink?.code}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { X, MapPin, Calendar, Check, Plus, ChevronDown, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatDateRange } from '@/lib/utils/date';
import type { AIRecommendation } from '@/types';

type ModalView = 'select' | 'success' | 'details';
type TripGroup = 'current' | 'upcoming' | 'past';

interface TripLocation {
  trip_id: string;
  custom_location: string | null;
  city: { name: string; country: { name: string } | null } | null;
}

interface Trip {
  id: string;
  name: string;
  user_id: string;
  start_date: string | null;
  end_date: string | null;
  locations: TripLocation[];
}

interface Participant {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AddToTripModalProps {
  recommendation: AIRecommendation;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tripId: string, tripName: string) => void;
  destination?: string;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getTripGroup(trip: Trip): TripGroup {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!trip.start_date) return 'upcoming';
  if (trip.end_date && trip.end_date < todayStr) return 'past';
  if (trip.start_date <= todayStr && (!trip.end_date || trip.end_date >= todayStr)) return 'current';
  return 'upcoming';
}

function TripCard({
  trip,
  isSelected,
  onClick,
}: {
  trip: Trip;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const group = getTripGroup(trip);
  const location = trip.locations[0]?.custom_location || trip.locations[0]?.city?.name;
  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const photoQuery = location || trip.name;

  useEffect(() => {
    if (!photoQuery) return;
    let cancelled = false;
    fetch(`/api/unsplash/city-photo?query=${encodeURIComponent(photoQuery)}`)
      .then(res => {
        if (!res.ok || res.status === 204) throw new Error('no photo');
        return res.json();
      })
      .then(data => {
        if (!cancelled) setPhotoUrl(`${data.url.split('?')[0]}?w=400&h=120&fit=crop`);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [photoQuery]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border-2 transition-all overflow-hidden',
        isSelected ? 'border-seeya-purple' : 'border-gray-200 hover:border-gray-300'
      )}
    >
      {photoUrl && (
        <div className="relative w-full h-16 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={location ?? ''} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {group === 'current' && (
            <span className="absolute top-1.5 left-2 flex items-center gap-1 text-xs text-white font-semibold bg-green-500/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
              Now
            </span>
          )}
          {isSelected && (
            <div className="absolute top-1.5 right-2 w-5 h-5 rounded-full bg-seeya-purple flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          )}
        </div>
      )}
      <div className={cn('flex items-start justify-between', photoUrl ? 'p-3' : 'p-4')}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-seeya-text truncate">{trip.name}</p>
            {group === 'current' && !photoUrl && (
              <span className="flex-shrink-0 flex items-center gap-1 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Now
              </span>
            )}
          </div>
          {location && (
            <div className="flex items-center gap-1 text-sm text-seeya-text-secondary mt-1">
              <MapPin size={14} />
              <span className="truncate">{location}</span>
            </div>
          )}
          {dateRange && (
            <div className="flex items-center gap-1 text-sm text-seeya-text-secondary mt-0.5">
              <Calendar size={14} />
              <span>{dateRange}</span>
            </div>
          )}
        </div>
        {!photoUrl && isSelected && (
          <div className="w-6 h-6 rounded-full bg-seeya-purple flex items-center justify-center flex-shrink-0">
            <Check size={14} className="text-white" />
          </div>
        )}
      </div>
    </button>
  );
}

export function AddToTripModal({
  recommendation,
  isOpen,
  onClose,
  onSuccess,
  destination,
}: AddToTripModalProps) {
  const { user } = useAuthStore();
  const [view, setView] = useState<ModalView>('select');

  // Trip selection
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTripName, setSelectedTripName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Post-add
  const [tripBitId, setTripBitId] = useState<string | null>(null);

  // Detail form
  const [detailDate, setDetailDate] = useState('');
  const [detailTime, setDetailTime] = useState('');
  const [detailEndDate, setDetailEndDate] = useState('');
  const [detailStatus, setDetailStatus] = useState<'idea' | 'confirmed'>('idea');
  const [detailConfirmation, setDetailConfirmation] = useState('');
  const [detailPartySize, setDetailPartySize] = useState(2);
  const [detailParticipants, setDetailParticipants] = useState<string[]>([]);
  const [tripParticipants, setTripParticipants] = useState<Participant[]>([]);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isFetchingParticipants, setIsFetchingParticipants] = useState(false);

  const categoryMap: Record<string, string> = {
    restaurant: 'dining',
    activity: 'activity',
    stay: 'stay',
    tip: 'other',
  };
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryMap[recommendation.category] || 'other'
  );

  const allCategories = [
    { id: 'flight', label: 'Flight' },
    { id: 'stay', label: 'Stay' },
    { id: 'car', label: 'Car' },
    { id: 'activity', label: 'Activity' },
    { id: 'transport', label: 'Transit' },
    { id: 'money', label: 'Money' },
    { id: 'dining', label: 'Dining' },
    { id: 'reservation', label: 'Reserv.' },
    { id: 'document', label: 'Doc' },
    { id: 'photos', label: 'Photos' },
    { id: 'other', label: 'Other' },
  ];

  useEffect(() => {
    if (isOpen && user) {
      fetchTrips();
    }
    if (!isOpen) {
      setView('select');
      setSelectedTripId(null);
      setAddError(null);
      setTripBitId(null);
      setDetailDate('');
      setDetailTime('');
      setDetailEndDate('');
      setDetailStatus('idea');
      setDetailConfirmation('');
      setDetailPartySize(2);
      setDetailParticipants([]);
      setTripParticipants([]);
    }
  }, [isOpen, user]);

  const fetchTrips = async () => {
    if (!user) return;
    setIsLoading(true);
    const supabase = createClient();

    const [{ data: ownedTrips }, { data: participations }] = await Promise.all([
      supabase.from('trips').select('id').eq('user_id', user.id),
      supabase.from('trip_participants').select('trip_id').eq('user_id', user.id).eq('status', 'confirmed'),
    ]);

    const allTripIds = Array.from(new Set([
      ...(ownedTrips?.map(t => t.id) || []),
      ...(participations?.map(p => p.trip_id) || []),
    ]));

    if (allTripIds.length === 0) {
      setTrips([]);
      setIsLoading(false);
      return;
    }

    const [{ data: tripsData }, { data: locations }] = await Promise.all([
      supabase.from('trips').select('id, name, user_id, start_date, end_date').in('id', allTripIds).order('start_date', { ascending: true }),
      supabase.from('trip_locations').select('trip_id, custom_location, city:cities(name, country:countries(name))').in('trip_id', allTripIds).order('order_index'),
    ]);

    const allTrips: Trip[] = (tripsData || []).map(trip => ({
      ...trip,
      locations: (locations?.filter(l => l.trip_id === trip.id) || []) as TripLocation[],
    }));

    // Look up destination country for sorting
    let destinationCountry: string | null = null;
    if (destination) {
      const { data: cityData } = await supabase
        .from('cities')
        .select('country:countries(name)')
        .ilike('name', destination)
        .limit(1)
        .maybeSingle();
      destinationCountry = (cityData?.country as { name: string } | null)?.name || null;
    }

    const matchScore = (trip: Trip): number => {
      if (!destination) return 0;
      const dest = destination.toLowerCase();
      const cityMatch = trip.locations.some(l => {
        const cityName = l.city?.name?.toLowerCase() || '';
        const customLoc = l.custom_location?.toLowerCase() || '';
        return cityName === dest || customLoc.includes(dest);
      });
      if (cityMatch) return 2;
      if (destinationCountry) {
        const countryMatch = trip.locations.some(l =>
          l.city?.country?.name?.toLowerCase() === destinationCountry!.toLowerCase()
        );
        if (countryMatch) return 1;
      }
      return 0;
    };

    const groupOrder: Record<TripGroup, number> = { current: 0, upcoming: 1, past: 2 };

    allTrips.sort((a, b) => {
      const gA = getTripGroup(a);
      const gB = getTripGroup(b);
      const groupDiff = groupOrder[gA] - groupOrder[gB];
      if (groupDiff !== 0) return groupDiff;
      // Within same group: destination match first
      const scoreDiff = matchScore(b) - matchScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      // Then by date (past: most recent first, others: soonest first)
      const dateA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return gA === 'past' ? dateB - dateA : dateA - dateB;
    });

    setTrips(allTrips);
    setIsLoading(false);
  };

  const fetchParticipants = async (tripId: string, tripOwnerId: string) => {
    setIsFetchingParticipants(true);
    const supabase = createClient();

    const { data: parts } = await supabase
      .from('trip_participants')
      .select('user_id, profile:profiles(full_name, avatar_url)')
      .eq('trip_id', tripId)
      .eq('status', 'confirmed');

    const participants: Participant[] = (parts || []).map((p: any) => ({
      user_id: p.user_id,
      full_name: p.profile?.full_name || null,
      avatar_url: p.profile?.avatar_url || null,
    }));

    // Add trip owner if not already listed
    if (!participants.find(p => p.user_id === tripOwnerId)) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', tripOwnerId)
        .maybeSingle();
      if (ownerProfile) {
        participants.unshift({
          user_id: tripOwnerId,
          full_name: ownerProfile.full_name,
          avatar_url: ownerProfile.avatar_url,
        });
      }
    }

    setTripParticipants(participants);
    setIsFetchingParticipants(false);
  };

  const handleAdd = async () => {
    if (!user || !selectedTripId) return;
    setIsAdding(true);
    setAddError(null);
    const supabase = createClient();

    const notesParts: string[] = [];
    if (recommendation.description) notesParts.push(recommendation.description);
    if (recommendation.tips) notesParts.push(`Tip: ${recommendation.tips}`);
    if (recommendation.estimatedCost) notesParts.push(`Estimated cost: ${recommendation.estimatedCost}`);
    if (recommendation.bestTimeToVisit) notesParts.push(`Best time: ${recommendation.bestTimeToVisit}`);

    const { data: inserted, error } = await supabase
      .from('trip_bits')
      .insert({
        trip_id: selectedTripId,
        created_by: user.id,
        category: selectedCategory,
        title: recommendation.title,
        notes: notesParts.join('\n\n'),
        status: 'idea',
      })
      .select('id')
      .single();

    setIsAdding(false);

    if (error) {
      setAddError(error.message || 'Failed to add to trip. Please try again.');
    } else {
      const trip = trips.find(t => t.id === selectedTripId);
      setSelectedTripName(trip?.name || 'Trip');
      setTripBitId(inserted.id);
      setView('success');
    }
  };

  const handleGoToDetails = async () => {
    const trip = trips.find(t => t.id === selectedTripId);
    if (!trip) return;
    setView('details');
    fetchParticipants(selectedTripId!, trip.user_id);
  };

  const handleSaveDetails = async () => {
    if (!tripBitId || !selectedTripId) return;
    setIsSavingDetails(true);
    const supabase = createClient();

    let start_datetime: string | null = null;
    if (detailDate) {
      start_datetime = detailTime ? `${detailDate}T${detailTime}:00` : `${detailDate}T00:00:00`;
    }

    let end_datetime: string | null = null;
    if (selectedCategory === 'stay' && detailEndDate) {
      end_datetime = `${detailEndDate}T12:00:00`;
    }

    await supabase
      .from('trip_bits')
      .update({
        ...(start_datetime && { start_datetime }),
        ...(end_datetime && { end_datetime }),
        status: detailStatus,
      })
      .eq('id', tripBitId);

    const details: Record<string, unknown> = {};
    if (detailConfirmation) details.confirmationNumber = detailConfirmation;
    if (['dining', 'reservation'].includes(selectedCategory)) {
      details.partySize = detailPartySize;
      if (detailTime) details.reservationTime = detailTime;
    }
    if (detailParticipants.length > 0) details.participantIds = detailParticipants;

    if (Object.keys(details).length > 0) {
      await supabase
        .from('trip_bit_details')
        .upsert({ trip_bit_id: tripBitId, details });
    }

    setIsSavingDetails(false);
    onSuccess(selectedTripId, selectedTripName);
  };

  const toggleParticipant = (userId: string) => {
    setDetailParticipants(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const currentTrips = trips.filter(t => getTripGroup(t) === 'current');
  const upcomingTrips = trips.filter(t => getTripGroup(t) === 'upcoming');
  const pastTrips = trips.filter(t => getTripGroup(t) === 'past');

  const showsDining = ['dining', 'reservation'].includes(selectedCategory);
  const showsStay = selectedCategory === 'stay';
  const showsParticipants = showsDining || selectedCategory === 'activity';
  const statusLabel = showsDining ? 'Made reservation' : 'Booked';

  const renderTripCard = (trip: Trip) => (
    <TripCard
      key={trip.id}
      trip={trip}
      isSelected={selectedTripId === trip.id}
      onClick={() => setSelectedTripId(trip.id)}
    />
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={view === 'select' ? onClose : undefined}
      />

      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-seeya-text">
            {view === 'select' ? 'Add to Trip' : view === 'success' ? 'Added!' : 'Add Details'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-seeya-text-secondary" />
          </button>
        </div>

        {/* ===== SELECT VIEW ===== */}
        {view === 'select' && (
          <>
            <div className="p-4 bg-gray-50 border-b flex-shrink-0">
              <p className="text-sm text-seeya-text-secondary mb-1">Adding:</p>
              <p className="font-medium text-seeya-text">{recommendation.title}</p>
            </div>

            <div className="px-4 py-3 border-b bg-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-seeya-text-secondary">Category</span>
                <button
                  onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium"
                >
                  {allCategories.find(c => c.id === selectedCategory)?.label || selectedCategory}
                  <ChevronDown size={14} className={cn('transition-transform', showCategoryPicker && 'rotate-180')} />
                </button>
              </div>
              {showCategoryPicker && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {allCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setShowCategoryPicker(false); }}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                        selectedCategory === cat.id
                          ? 'bg-seeya-purple text-white'
                          : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><Spinner size="lg" /></div>
              ) : trips.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🌍</div>
                  <p className="text-seeya-text-secondary mb-4">No trips yet</p>
                  <Button variant="purple" onClick={() => { onClose(); window.location.href = '/trips/new'; }}>
                    <Plus size={16} className="mr-2" />Create a Trip
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-seeya-text-secondary">Select a trip to add this recommendation:</p>

                  {currentTrips.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Current</p>
                      <div className="space-y-2">{currentTrips.map(renderTripCard)}</div>
                    </div>
                  )}

                  {(upcomingTrips.length > 0 || pastTrips.length > 0) && (
                    <div className="space-y-2">
                      {upcomingTrips.map(renderTripCard)}
                      {pastTrips.map(renderTripCard)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {trips.length > 0 && (
              <div className="p-4 border-t flex-shrink-0">
                {addError && <p className="text-sm text-red-600 mb-3">{addError}</p>}
                <Button
                  variant="purple"
                  className="w-full"
                  disabled={!selectedTripId || isAdding}
                  onClick={handleAdd}
                >
                  {isAdding ? <Spinner size="sm" className="mr-2" /> : <Plus size={16} className="mr-2" />}
                  Add to Trip
                </Button>
              </div>
            )}
          </>
        )}

        {/* ===== SUCCESS VIEW ===== */}
        {view === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-seeya-text text-lg">{recommendation.title}</p>
              <p className="text-seeya-text-secondary text-sm mt-1">Added to {selectedTripName}</p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={handleGoToDetails}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-seeya-purple text-seeya-purple font-medium hover:bg-purple-50 transition-colors"
              >
                Add details
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => onSuccess(selectedTripId!, selectedTripName)}
                className="w-full py-3 text-sm text-seeya-text-secondary hover:text-seeya-text transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ===== DETAILS VIEW ===== */}
        {view === 'details' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Status toggle */}
              <div>
                <label className="text-sm font-medium text-seeya-text mb-2 block">Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailStatus('idea')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors',
                      detailStatus === 'idea'
                        ? 'border-seeya-purple bg-purple-50 text-seeya-purple'
                        : 'border-gray-200 text-seeya-text-secondary hover:border-gray-300'
                    )}
                  >
                    💡 Idea
                  </button>
                  <button
                    onClick={() => setDetailStatus('confirmed')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors',
                      detailStatus === 'confirmed'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-seeya-text-secondary hover:border-gray-300'
                    )}
                  >
                    ✓ {statusLabel}
                  </button>
                </div>
              </div>

              {/* Stay: check-in / check-out dates */}
              {showsStay ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-seeya-text mb-1 block">Check-in</label>
                    <input
                      type="date"
                      value={detailDate}
                      onChange={e => setDetailDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-seeya-text mb-1 block">Check-out</label>
                    <input
                      type="date"
                      value={detailEndDate}
                      onChange={e => setDetailEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple"
                    />
                  </div>
                </div>
              ) : (
                /* Date + Time for all other categories */
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-seeya-text mb-1 block">Date</label>
                    <input
                      type="date"
                      value={detailDate}
                      onChange={e => setDetailDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-seeya-text mb-1 block">Time</label>
                    <input
                      type="time"
                      value={detailTime}
                      onChange={e => setDetailTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple"
                    />
                  </div>
                </div>
              )}

              {/* Party size (dining / reservation) */}
              {showsDining && (
                <div>
                  <label className="text-sm font-medium text-seeya-text mb-2 block">Party size</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setDetailPartySize(p => Math.max(1, p - 1))}
                      className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-lg font-medium hover:border-seeya-purple hover:text-seeya-purple transition-colors"
                    >
                      −
                    </button>
                    <span className="text-xl font-semibold text-seeya-text w-6 text-center">{detailPartySize}</span>
                    <button
                      onClick={() => setDetailPartySize(p => p + 1)}
                      className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-lg font-medium hover:border-seeya-purple hover:text-seeya-purple transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Who's going (dining + activity) */}
              {showsParticipants && (
                <div>
                  <label className="text-sm font-medium text-seeya-text mb-2 block">Who&apos;s going</label>
                  {isFetchingParticipants ? (
                    <Spinner size="sm" />
                  ) : tripParticipants.length === 0 ? (
                    <p className="text-sm text-seeya-text-secondary">No other participants on this trip yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tripParticipants.map(p => {
                        const isSelected = detailParticipants.includes(p.user_id);
                        return (
                          <button
                            key={p.user_id}
                            onClick={() => toggleParticipant(p.user_id)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm transition-colors',
                              isSelected
                                ? 'border-seeya-purple bg-purple-50 text-seeya-purple'
                                : 'border-gray-200 text-seeya-text-secondary hover:border-gray-300'
                            )}
                          >
                            <div className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                              isSelected ? 'bg-seeya-purple text-white' : 'bg-gray-200 text-gray-600'
                            )}>
                              {getInitials(p.full_name)}
                            </div>
                            {p.full_name?.split(' ')[0] || 'Guest'}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation number (only when confirmed) */}
              {detailStatus === 'confirmed' && (
                <div>
                  <label className="text-sm font-medium text-seeya-text mb-1 block">Confirmation #</label>
                  <input
                    type="text"
                    value={detailConfirmation}
                    onChange={e => setDetailConfirmation(e.target.value)}
                    placeholder="e.g. ABC123"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple font-mono"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t flex-shrink-0 space-y-2">
              <Button
                variant="purple"
                className="w-full"
                disabled={isSavingDetails}
                onClick={handleSaveDetails}
              >
                {isSavingDetails && <Spinner size="sm" className="mr-2" />}
                Save details
              </Button>
              <button
                onClick={() => onSuccess(selectedTripId!, selectedTripName)}
                className="w-full py-2 text-sm text-seeya-text-secondary hover:text-seeya-text transition-colors"
              >
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { X, MapPin, Calendar, Check, Plus } from 'lucide-react';
import { formatDateRange } from '@/lib/utils/date';
import type { AIRecommendation } from '@/types';

interface Trip {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  locations: { custom_location: string | null }[];
}

interface AddToTripModalProps {
  recommendation: AIRecommendation;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tripId: string, tripName: string) => void;
}

export function AddToTripModal({
  recommendation,
  isOpen,
  onClose,
  onSuccess,
}: AddToTripModalProps) {
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchTrips();
    }
  }, [isOpen, user]);

  const fetchTrips = async () => {
    if (!user) return;

    setIsLoading(true);
    const supabase = createClient();

    // Get trips where user is owner
    const { data: ownedTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('user_id', user.id);

    // Get trips where user is participant
    const { data: participations } = await supabase
      .from('trip_participants')
      .select('trip_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const ownedIds = ownedTrips?.map(t => t.id) || [];
    const participantIds = participations?.map(p => p.trip_id) || [];
    const allTripIds = Array.from(new Set([...ownedIds, ...participantIds]));

    if (allTripIds.length === 0) {
      setTrips([]);
      setIsLoading(false);
      return;
    }

    // Get trip details with locations
    const { data: tripsData } = await supabase
      .from('trips')
      .select('id, name, start_date, end_date')
      .in('id', allTripIds)
      .order('start_date', { ascending: true });

    // Get locations for all trips
    const { data: locations } = await supabase
      .from('trip_locations')
      .select('trip_id, custom_location')
      .in('trip_id', allTripIds)
      .order('order_index');

    // Combine data
    const tripsWithLocations = (tripsData || []).map(trip => ({
      ...trip,
      locations: locations?.filter(l => l.trip_id === trip.id) || [],
    }));

    // Filter to only upcoming/current trips (not past)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingTrips = tripsWithLocations.filter(trip => {
      if (!trip.end_date) return true; // No end date = include
      return new Date(trip.end_date) >= today;
    });

    setTrips(upcomingTrips);
    setIsLoading(false);
  };

  const handleAdd = async () => {
    if (!user || !selectedTripId) return;

    setIsAdding(true);
    const supabase = createClient();

    // Map recommendation category to TripBit category
    const categoryMap: Record<string, string> = {
      restaurant: 'restaurant',
      activity: 'activity',
      stay: 'hotel',
      tip: 'note',
    };

    // Build notes from recommendation
    const notesParts: string[] = [];
    if (recommendation.description) {
      notesParts.push(recommendation.description);
    }
    if (recommendation.tips) {
      notesParts.push(`Tip: ${recommendation.tips}`);
    }
    if (recommendation.estimatedCost) {
      notesParts.push(`Estimated cost: ${recommendation.estimatedCost}`);
    }
    if (recommendation.bestTimeToVisit) {
      notesParts.push(`Best time: ${recommendation.bestTimeToVisit}`);
    }

    const { error } = await supabase.from('trip_bits').insert({
      trip_id: selectedTripId,
      created_by: user.id,
      category: categoryMap[recommendation.category] || 'other',
      title: recommendation.title,
      notes: notesParts.join('\n\n'),
      status: 'idea',
    });

    setIsAdding(false);

    if (!error) {
      const trip = trips.find(t => t.id === selectedTripId);
      onSuccess(selectedTripId, trip?.name || 'Trip');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-seeya-text">Add to Trip</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-seeya-text-secondary" />
          </button>
        </div>

        {/* Recommendation preview */}
        <div className="p-4 bg-gray-50 border-b">
          <p className="text-sm text-seeya-text-secondary mb-1">Adding:</p>
          <p className="font-medium text-seeya-text">{recommendation.title}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🌍</div>
              <p className="text-seeya-text-secondary mb-4">
                No upcoming trips yet
              </p>
              <Button
                variant="purple"
                onClick={() => {
                  onClose();
                  window.location.href = '/trips/new';
                }}
              >
                <Plus size={16} className="mr-2" />
                Create a Trip
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-seeya-text-secondary mb-3">
                Select a trip to add this recommendation:
              </p>
              {trips.map(trip => {
                const isSelected = selectedTripId === trip.id;
                const location = trip.locations[0]?.custom_location;
                const dateRange = formatDateRange(trip.start_date, trip.end_date);

                return (
                  <button
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border-2 transition-all',
                      isSelected
                        ? 'border-seeya-purple bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-seeya-text truncate">
                          {trip.name}
                        </p>
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
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-seeya-purple flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {trips.length > 0 && (
          <div className="p-4 border-t">
            <Button
              variant="purple"
              className="w-full"
              disabled={!selectedTripId || isAdding}
              onClick={handleAdd}
            >
              {isAdding ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              Add to Trip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

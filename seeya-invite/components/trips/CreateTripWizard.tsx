'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Input, Button, Card, Spinner, Avatar } from '@/components/ui';
import {
  X,
  MapPin,
  Calendar,
  CalendarClock,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Check,
  Users,
  Briefcase,
  Crown,
  Gift,
  Music,
  Mountain,
  Heart,
  Compass,
  Umbrella,
  Building2,
  UtensilsCrossed,
  Leaf,
  Landmark,
  PartyPopper,
  TreePine,
  Car,
  Backpack,
  Trophy,
  Lock,
  EyeOff,
  Globe,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { tripVibes, generateTripNameSuggestions, getContinent, type TripVibe } from '@/lib/tripVibes';
import type { Profile, VisibilityLevel } from '@/types/database';
import { VISIBILITY_OPTIONS } from '@/types/database';

// Wizard steps
type WizardStep = 'whereWhen' | 'vibe' | 'name' | 'who' | 'privacy';

const STEPS: WizardStep[] = ['whereWhen', 'vibe', 'name', 'who', 'privacy'];

const STEP_CONFIG: Record<WizardStep, { title: string; subtitle: string }> = {
  whereWhen: { title: 'Where & When', subtitle: 'Where are you headed?' },
  vibe: { title: 'Vibe', subtitle: "What's the vibe?" },
  name: { title: 'Name', subtitle: 'Give your trip a name' },
  who: { title: 'Who', subtitle: "Who's coming along?" },
  privacy: { title: 'Privacy', subtitle: 'Who can see this trip?' },
};

// Date mode
type DateMode = 'exact' | 'flexible' | 'tbd';

// Map vibe IDs to Lucide icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vibeIcons: Record<string, any> = {
  bachelor: Users,
  bachelorette: Sparkles,
  golf: Trophy,
  work: Briefcase,
  girls: Crown,
  guys: Users,
  sports: Trophy,
  anniversary: Heart,
  birthday: Gift,
  concert: Music,
  ski: Mountain,
  honeymoon: Heart,
  adventure: Compass,
  beach: Umbrella,
  city: Building2,
  romantic: Heart,
  family: Users,
  foodie: UtensilsCrossed,
  wellness: Leaf,
  cultural: Landmark,
  nightlife: PartyPopper,
  nature: TreePine,
  roadtrip: Car,
  backpacking: Backpack,
};

interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

interface Destination {
  id: string;
  name: string;
  placeId?: string;
  startDate?: string;
  endDate?: string;
  country?: string;
  continent?: string;
}

interface CreateTripWizardProps {
  onClose: () => void;
  onSuccess: (tripId: string) => void;
}

export function CreateTripWizard({ onClose, onSuccess }: CreateTripWizardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<WizardStep>('whereWhen');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Where & When
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [newDestination, setNewDestination] = useState('');
  const [placePredictions, setPlacePredictions] = useState<PlacePrediction[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const [dateMode, setDateMode] = useState<DateMode>('exact');
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());

  // Step 2: Vibe
  const [selectedVibes, setSelectedVibes] = useState<Set<string>>(new Set());

  // Step 3: Name
  const [tripName, setTripName] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);
  const [coverCity, setCoverCity] = useState<string>('');
  const [coverPhotos, setCoverPhotos] = useState<Record<string, string>>({});
  const [isFetchingPhotos, setIsFetchingPhotos] = useState(false);

  // Step 4: Who
  const [friends, setFriends] = useState<Profile[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  // Step 5: Privacy
  const [visibility, setVisibility] = useState<VisibilityLevel>('full_details');

  // Fetch friends
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      setIsLoadingFriends(true);

      const supabase = createClient();

      // Get accepted friendships where user is requester
      const { data: sentFriendships } = await supabase
        .from('friendships')
        .select('addressee_id')
        .eq('requester_id', user.id)
        .eq('status', 'accepted');

      // Get accepted friendships where user is addressee
      const { data: receivedFriendships } = await supabase
        .from('friendships')
        .select('requester_id')
        .eq('addressee_id', user.id)
        .eq('status', 'accepted');

      const friendIds = [
        ...(sentFriendships?.map((f) => f.addressee_id) || []),
        ...(receivedFriendships?.map((f) => f.requester_id) || []),
      ];

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', friendIds);

        setFriends(profiles || []);
      }

      setIsLoadingFriends(false);
    };

    fetchFriends();
  }, [user]);

  // Fetch Unsplash cover photos for each destination
  const fetchCoverPhotos = useCallback(async () => {
    if (isFetchingPhotos || destinations.length === 0) return;
    setIsFetchingPhotos(true);
    const photos: Record<string, string> = {};
    await Promise.all(
      destinations.slice(0, 4).map(async (dest) => {
        const city = dest.name.split(',')[0].trim();
        try {
          const res = await fetch(`/api/unsplash/city-photo?city=${encodeURIComponent(city)}`);
          const data = await res.json();
          if (data.photoUrl) photos[city] = data.photoUrl;
        } catch { /* ignore */ }
      })
    );
    setCoverPhotos(photos);
    if (!coverCity && destinations[0]) {
      setCoverCity(destinations[0].name.split(',')[0].trim());
    }
    setIsFetchingPhotos(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinations]);

  // Generate name suggestions when vibes or destinations change
  const updateNameSuggestions = useCallback(() => {
    const vibeList = tripVibes.filter((v) => selectedVibes.has(v.id));
    const startDate = destinations[0]?.startDate ? new Date(destinations[0].startDate) : null;

    const suggestions = generateTripNameSuggestions(destinations, vibeList, startDate, 4);
    setNameSuggestions(suggestions);

    // Auto-fill first suggestion if name is empty
    if (!tripName && suggestions.length > 0) {
      setTripName(suggestions[0]);
    }
  }, [destinations, selectedVibes, tripName]);

  useEffect(() => {
    if (currentStep === 'name') {
      updateNameSuggestions();
      if (Object.keys(coverPhotos).length === 0) {
        fetchCoverPhotos();
      }
    }
  }, [currentStep, updateNameSuggestions, fetchCoverPhotos, coverPhotos]);

  // Places search effect
  useEffect(() => {
    if (!newDestination.trim() || newDestination.length < 2) {
      setPlacePredictions([]);
      setShowPredictions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const response = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(newDestination)}`);
        const data = await response.json();
        if (data.predictions) {
          setPlacePredictions(data.predictions);
          setShowPredictions(true);
        }
      } catch (err) {
        console.error('Places search error:', err);
      }
      setIsSearchingPlaces(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [newDestination]);

  // Add destination helper
  const addDestination = (name: string, placeId?: string, country?: string, continent?: string) => {
    const dest: Destination = {
      id: Date.now().toString(),
      name,
      placeId,
      country,
      continent,
    };

    if (dateMode === 'exact') {
      const today = new Date();
      const lastEnd = destinations.length > 0 && destinations[destinations.length - 1].endDate
        ? new Date(destinations[destinations.length - 1].endDate!)
        : today;
      dest.startDate = lastEnd.toISOString().split('T')[0];
      dest.endDate = new Date(lastEnd.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    setDestinations([...destinations, dest]);
    setNewDestination('');
    setPlacePredictions([]);
    setShowPredictions(false);
    // Clear cached photos so they refresh when user reaches name step
    setCoverPhotos({});
    setCoverCity('');
  };

  // Add destination from text input
  const handleAddDestination = () => {
    if (!newDestination.trim()) return;
    addDestination(newDestination.trim());
  };

  // Add destination from Places prediction — extract country from secondaryText
  const handleSelectPrediction = (prediction: PlacePrediction) => {
    const parts = prediction.secondaryText.split(', ');
    const country = parts[parts.length - 1]?.trim() || undefined;
    const continent = country ? getContinent(country) : undefined;
    addDestination(prediction.description, prediction.placeId, country, continent);
  };

  const handleRemoveDestination = (id: string) => {
    setDestinations(destinations.filter((d) => d.id !== id));
    // Clear cached photos so they refresh when user reaches name step
    setCoverPhotos({});
    setCoverCity('');
  };

  const moveDestination = (id: string, direction: 'up' | 'down') => {
    setDestinations(prev => {
      const idx = prev.findIndex(d => d.id === id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const handleUpdateDestinationDate = (id: string, field: 'startDate' | 'endDate', value: string) => {
    setDestinations(prev => {
      const idx = prev.findIndex(d => d.id === id);
      if (idx === -1) return prev;

      const updated = [...prev];
      const dest = { ...updated[idx], [field]: value };

      // Within same stop: push end date if start date conflicts
      if (field === 'startDate' && value && dest.endDate && dest.endDate <= value) {
        const next = new Date(value);
        next.setDate(next.getDate() + 1);
        dest.endDate = next.toISOString().split('T')[0];
      }
      updated[idx] = dest;

      // Cascade: when depart date changes, update next stop's arrive date
      if (field === 'endDate' && value && idx + 1 < updated.length) {
        const nextDest = { ...updated[idx + 1] };
        if (!nextDest.startDate || nextDest.startDate < value) {
          nextDest.startDate = value;
          // Also push next stop's end date if it now conflicts
          if (nextDest.endDate && nextDest.endDate <= value) {
            const nextEnd = new Date(value);
            nextEnd.setDate(nextEnd.getDate() + 1);
            nextDest.endDate = nextEnd.toISOString().split('T')[0];
          }
          updated[idx + 1] = nextDest;
        }
      }

      return updated;
    });
  };

  // Navigation
  const currentStepIndex = STEPS.indexOf(currentStep);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'whereWhen':
        return destinations.length > 0;
      case 'vibe':
        return true; // Optional
      case 'name':
        return tripName.trim().length > 0;
      case 'who':
        return true; // Optional
      case 'privacy':
        return true;
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  // Create trip
  const handleCreateTrip = async () => {
    if (!user) return;

    setIsCreating(true);
    setError(null);

    try {
      const supabase = createClient();

      // Calculate trip dates
      let startDate: string | null = null;
      let endDate: string | null = null;

      if (dateMode === 'exact') {
        startDate = destinations.reduce((min, d) => {
          if (!d.startDate) return min;
          return !min || d.startDate < min ? d.startDate : min;
        }, null as string | null);

        endDate = destinations.reduce((max, d) => {
          if (!d.endDate) return max;
          return !max || d.endDate > max ? d.endDate : max;
        }, null as string | null);
      } else if (dateMode === 'flexible' && selectedMonths.size > 0) {
        const sorted = Array.from(selectedMonths).sort();
        const [firstYear, firstMonth] = sorted[0].split('-').map(Number);
        const [lastYear, lastMonth] = sorted[sorted.length - 1].split('-').map(Number);
        startDate = `${firstYear}-${String(firstMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(lastYear, lastMonth, 0).getDate();
        endDate = `${lastYear}-${String(lastMonth).padStart(2, '0')}-${lastDay}`;
      }

      // Single SECURITY DEFINER RPC call — creates trip, participant, locations,
      // and friend invites atomically, bypassing all client-side RLS.
      const { data: tripId, error: rpcError } = await supabase.rpc('create_trip_with_locations', {
        p_name: tripName.trim(),
        p_description: tripDescription.trim() || null,
        p_start_date: startDate,
        p_end_date: endDate,
        p_visibility: visibility,
        p_cover_photo_city: coverCity || destinations[0]?.name.split(',')[0].trim() || null,
        p_locations: destinations.map((dest, i) => ({
          custom_location: dest.name,
          order_index: i,
          arrival_date: dest.startDate || null,
          departure_date: dest.endDate || null,
        })),
        p_invited_friends: Array.from(selectedFriends),
      });

      if (rpcError) {
        console.error('❌ [CreateTrip] RPC error:', rpcError);
        setError(`Failed to create trip: ${rpcError.message} [code: ${rpcError.code}]`);
        return;
      }

      onSuccess(tripId as string);
    } catch (err) {
      console.error('❌ [CreateTrip] Error:', err);
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? JSON.stringify(err);
      setError(`Failed to create trip: ${msg}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'whereWhen':
        return renderWhereWhenStep();
      case 'vibe':
        return renderVibeStep();
      case 'name':
        return renderNameStep();
      case 'who':
        return renderWhoStep();
      case 'privacy':
        return renderPrivacyStep();
    }
  };

  // Step 1: Where & When
  const renderWhereWhenStep = () => (
    <div className="space-y-6">
      {/* Date Mode Picker */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        {([
          { id: 'exact', label: 'Exact dates', icon: Calendar },
          { id: 'flexible', label: 'Flexible', icon: CalendarClock },
          { id: 'tbd', label: 'TBD', icon: HelpCircle },
        ] as const).map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setDateMode(mode.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                dateMode === mode.id
                  ? 'bg-black text-white'
                  : 'text-seeya-text-secondary hover:text-seeya-text'
              )}
            >
              <Icon size={16} />
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* Flexible Month Picker */}
      {dateMode === 'flexible' && (
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-sm text-seeya-text-secondary mb-3">Pick one or more months</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(i);
              const monthKey = `${date.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
              const monthName = date.toLocaleString('default', { month: 'short' });
              const isSelected = selectedMonths.has(monthKey);
              return (
                <button
                  key={monthKey}
                  type="button"
                  onClick={() => {
                    const next = new Set(selectedMonths);
                    if (isSelected) next.delete(monthKey);
                    else next.add(monthKey);
                    setSelectedMonths(next);
                  }}
                  className={cn(
                    'py-2 px-1 rounded-lg text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-black text-white'
                      : 'bg-gray-50 text-seeya-text hover:bg-gray-100'
                  )}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TBD Message */}
      {dateMode === 'tbd' && (
        <div className="p-4 bg-purple-50 rounded-xl text-center">
          <p className="text-sm text-seeya-text-secondary">Dates will be determined later</p>
        </div>
      )}

      {/* Destinations */}
      <div className="space-y-3">
        {destinations.map((dest, index) => (
          <div key={dest.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <MapPin size={20} className="text-seeya-purple flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-seeya-text-secondary">Stop {index + 1}</p>
                <p className="font-medium text-seeya-text">{dest.name}</p>
              </div>
              {destinations.length > 1 && (
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveDestination(dest.id, 'up')}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-20"
                  >
                    <ChevronUp size={14} className="text-seeya-text-secondary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDestination(dest.id, 'down')}
                    disabled={index === destinations.length - 1}
                    className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-20"
                  >
                    <ChevronDown size={14} className="text-seeya-text-secondary" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemoveDestination(dest.id)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} className="text-seeya-text-secondary" />
              </button>
            </div>

            {dateMode === 'exact' && (
              <div className="border-t border-gray-100">
                {index > 0 && dest.startDate && destinations[index - 1].endDate &&
                  dest.startDate < destinations[index - 1].endDate! && (
                  <div className="flex items-center gap-1 px-4 pt-2 text-xs text-amber-600">
                    <AlertTriangle size={12} />
                    <span>Overlaps previous stop</span>
                  </div>
                )}
                <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-seeya-text-secondary">Arrive</label>
                    <input
                      type="date"
                      value={dest.startDate || ''}
                      onChange={(e) => handleUpdateDestinationDate(dest.id, 'startDate', e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-seeya-text-secondary">Depart</label>
                    <input
                      type="date"
                      value={dest.endDate || ''}
                      min={dest.startDate || undefined}
                      onChange={(e) => handleUpdateDestinationDate(dest.id, 'endDate', e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add destination with Places autocomplete */}
        <div className="relative">
          <div className="relative">
            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={destinations.length === 0 ? 'Search for a city or country...' : 'Add another stop...'}
              value={newDestination}
              onChange={(e) => setNewDestination(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDestination()}
              onFocus={() => newDestination.length >= 2 && setShowPredictions(true)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
            />
            {isSearchingPlaces && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {showPredictions && (placePredictions.length > 0 || newDestination.length >= 2) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-auto">
              {placePredictions.map((prediction) => (
                <button
                  key={prediction.placeId}
                  type="button"
                  onClick={() => handleSelectPrediction(prediction)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                >
                  <MapPin size={18} className="text-seeya-purple shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-seeya-text">{prediction.mainText}</p>
                    <p className="text-sm text-seeya-text-secondary truncate">{prediction.secondaryText}</p>
                  </div>
                </button>
              ))}

              {newDestination.length >= 2 && !isSearchingPlaces && (
                <button
                  type="button"
                  onClick={handleAddDestination}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-seeya-purple"
                >
                  <Sparkles size={18} />
                  <span>Use &quot;{newDestination}&quot; as custom location</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Itinerary Summary */}
      {destinations.length > 0 && (
        <div className="p-4 bg-purple-50 rounded-xl">
          <p className="text-xs text-seeya-text-secondary mb-1">Your itinerary</p>
          <p className="font-medium text-seeya-text">
            {destinations.map((d) => d.name).join(' → ')}
          </p>
          {dateMode === 'exact' && destinations[0]?.startDate && (
            <p className="text-sm text-seeya-text-secondary mt-1">
              {new Date(destinations[0].startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {destinations[destinations.length - 1]?.endDate && (
                <> - {new Date(destinations[destinations.length - 1].endDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Step 2: Vibe
  const renderVibeStep = () => (
    <div className="space-y-4">
      {/* Selected vibes */}
      {selectedVibes.size > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {Array.from(selectedVibes).map((vibeId) => {
            const vibe = tripVibes.find((v) => v.id === vibeId);
            if (!vibe) return null;
            const Icon = vibeIcons[vibe.id] || Compass;
            return (
              <span
                key={vibeId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-seeya-purple text-white rounded-full text-sm"
              >
                <Icon size={14} />
                {vibe.name}
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(selectedVibes);
                    next.delete(vibeId);
                    setSelectedVibes(next);
                  }}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Vibe grid */}
      <div className="grid grid-cols-3 gap-3">
        {tripVibes.map((vibe) => {
          const Icon = vibeIcons[vibe.id] || Compass;
          const isSelected = selectedVibes.has(vibe.id);
          return (
            <button
              key={vibe.id}
              type="button"
              onClick={() => {
                const next = new Set(selectedVibes);
                if (isSelected) {
                  next.delete(vibe.id);
                } else {
                  next.add(vibe.id);
                }
                setSelectedVibes(next);
              }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl transition-all',
                isSelected
                  ? 'bg-black text-white'
                  : 'bg-white border border-gray-200 hover:border-gray-300'
              )}
            >
              <Icon size={24} className={isSelected ? 'text-white' : 'text-seeya-purple'} />
              <span className="text-xs font-medium text-center leading-tight">{vibe.name}</span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-sm text-seeya-text-secondary">
        Select one or more vibes to get AI-powered name suggestions!
      </p>
    </div>
  );

  // Step 3: Name
  const renderNameStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-seeya-text-secondary mb-2">Trip name</label>
        <Input
          placeholder="e.g., Summer in Paris"
          value={tripName}
          onChange={(e) => setTripName(e.target.value)}
        />
      </div>

      {/* AI Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-seeya-purple" />
          <span className="text-sm text-seeya-text-secondary">AI-powered suggestions</span>
          {isGeneratingNames && <Spinner size="sm" />}
          <button
            type="button"
            onClick={updateNameSuggestions}
            disabled={isGeneratingNames}
            className="ml-auto p-1 hover:bg-gray-100 rounded"
          >
            <RefreshCw size={14} className="text-seeya-purple" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {nameSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTripName(suggestion)}
              className={cn(
                'px-4 py-2 rounded-full text-sm transition-all',
                tripName === suggestion
                  ? 'bg-seeya-purple text-white'
                  : 'bg-white border border-gray-200 hover:border-gray-300'
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Cover Photo Picker */}
      {destinations.length > 0 && (
        <div>
          <label className="block text-sm text-seeya-text-secondary mb-2">Cover Photo</label>
          {isFetchingPhotos ? (
            <div className="flex gap-2">
              {destinations.slice(0, 4).map((_, i) => (
                <div key={i} className="w-20 h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : Object.keys(coverPhotos).length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {destinations.slice(0, 4).map((dest) => {
                const city = dest.name.split(',')[0].trim();
                const photo = coverPhotos[city];
                if (!photo) return null;
                const isSelected = coverCity === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setCoverCity(city)}
                    className={cn(
                      'relative w-20 h-14 rounded-lg overflow-hidden border-2 transition-all',
                      isSelected ? 'border-seeya-purple' : 'border-transparent'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={city} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-seeya-purple/20 flex items-center justify-center">
                        <Check size={16} className="text-white drop-shadow" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                      <span className="text-white text-[10px] leading-tight block truncate">{city}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm text-seeya-text-secondary mb-2">Description (optional)</label>
        <textarea
          placeholder="Add notes or details..."
          value={tripDescription}
          onChange={(e) => setTripDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all resize-none"
        />
      </div>
    </div>
  );

  // Step 4: Who
  const renderWhoStep = () => (
    <div className="space-y-4">
      {isLoadingFriends ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-8">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-semibold text-seeya-text mb-1">No friends yet</h3>
          <p className="text-sm text-seeya-text-secondary">Add friends to invite them on trips</p>
        </div>
      ) : (
        <>
          {friends.map((friend) => {
            const isSelected = selectedFriends.has(friend.id);
            return (
              <button
                key={friend.id}
                type="button"
                onClick={() => {
                  const next = new Set(selectedFriends);
                  if (isSelected) {
                    next.delete(friend.id);
                  } else {
                    next.add(friend.id);
                  }
                  setSelectedFriends(next);
                }}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
              >
                <Avatar name={friend.full_name} avatarUrl={friend.avatar_url} size="md" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-seeya-text">{friend.full_name}</p>
                </div>
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                    isSelected
                      ? 'bg-seeya-purple border-seeya-purple'
                      : 'border-gray-300'
                  )}
                >
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
              </button>
            );
          })}

          {selectedFriends.size > 0 && (
            <p className="text-center text-sm text-seeya-text-secondary">
              {selectedFriends.size} friend{selectedFriends.size === 1 ? '' : 's'} selected
            </p>
          )}
        </>
      )}

      <p className="text-center text-sm text-seeya-text-secondary">
        You can invite more friends later
      </p>
    </div>
  );

  // Step 5: Privacy
  const renderPrivacyStep = () => {
    const getVisibilityIcon = (level: VisibilityLevel) => {
      switch (level) {
        case 'only_me': return Lock;
        case 'busy_only': return EyeOff;
        case 'dates_only': return Calendar;
        case 'location_only': return MapPin;
        case 'full_details': return Globe;
      }
    };

    return (
      <div className="space-y-3">
        {VISIBILITY_OPTIONS.map((option) => {
          const Icon = getVisibilityIcon(option.value);
          const isSelected = visibility === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setVisibility(option.value)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                isSelected
                  ? 'bg-purple-50 border-seeya-purple'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              )}
            >
              <Icon size={20} className={isSelected ? 'text-seeya-purple' : 'text-seeya-text-secondary'} />
              <div className="flex-1 text-left">
                <p className={cn('font-medium', isSelected ? 'text-seeya-purple' : 'text-seeya-text')}>
                  {option.label}
                </p>
                <p className="text-sm text-seeya-text-secondary">{option.description}</p>
              </div>
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                  isSelected
                    ? 'bg-seeya-purple border-seeya-purple'
                    : 'border-gray-300'
                )}
              >
                {isSelected && <Check size={14} className="text-white" />}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-seeya-text hover:text-seeya-text-secondary"
          >
            Cancel
          </button>
          <span className="text-sm text-seeya-text-secondary">
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
          <div className="w-12" />
        </div>

        {/* Progress bar */}
        <div className="max-w-lg mx-auto px-6 pb-4">
          <div className="flex gap-2">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={cn(
                  'flex-1 h-1 rounded-full transition-colors',
                  index <= currentStepIndex ? 'bg-black' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-6">
        <h2 className="text-2xl font-semibold text-seeya-text mb-6">
          {STEP_CONFIG[currentStep].subtitle}
        </h2>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-seeya-error text-sm">
            {error}
          </div>
        )}

        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto px-6 py-4 flex gap-3">
          {currentStepIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={goToPrevStep}
              disabled={isCreating}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={currentStep === 'privacy' ? handleCreateTrip : goToNextStep}
            disabled={!canProceed() || isCreating}
            isLoading={isCreating}
            className="flex-1 bg-black hover:bg-gray-800 text-white"
          >
            {currentStep === 'privacy' ? 'Create Trip' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}

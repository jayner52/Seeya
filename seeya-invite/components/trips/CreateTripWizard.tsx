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
} from 'lucide-react';
import { tripVibes, generateTripNameSuggestions, type TripVibe } from '@/lib/tripVibes';
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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Step 2: Vibe
  const [selectedVibes, setSelectedVibes] = useState<Set<string>>(new Set());

  // Step 3: Name
  const [tripName, setTripName] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);

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

  // Generate name suggestions when vibes or destinations change
  const updateNameSuggestions = useCallback(() => {
    const vibeList = tripVibes.filter((v) => selectedVibes.has(v.id));
    const destNames = destinations.map((d) => d.name);
    const startDate = destinations[0]?.startDate ? new Date(destinations[0].startDate) : null;

    const suggestions = generateTripNameSuggestions(destNames, vibeList, startDate, 4);
    setNameSuggestions(suggestions);

    // Auto-fill first suggestion if name is empty
    if (!tripName && suggestions.length > 0) {
      setTripName(suggestions[0]);
    }
  }, [destinations, selectedVibes, tripName]);

  useEffect(() => {
    if (currentStep === 'name') {
      updateNameSuggestions();
    }
  }, [currentStep, updateNameSuggestions]);

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
  const addDestination = (name: string, placeId?: string) => {
    const dest: Destination = {
      id: Date.now().toString(),
      name,
      placeId,
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
  };

  // Add destination from text input
  const handleAddDestination = () => {
    if (!newDestination.trim()) return;
    addDestination(newDestination.trim());
  };

  // Add destination from Places prediction
  const handleSelectPrediction = (prediction: PlacePrediction) => {
    addDestination(prediction.description, prediction.placeId);
  };

  const handleRemoveDestination = (id: string) => {
    setDestinations(destinations.filter((d) => d.id !== id));
  };

  const handleUpdateDestinationDate = (id: string, field: 'startDate' | 'endDate', value: string) => {
    setDestinations(
      destinations.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
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
      } else if (dateMode === 'flexible' && selectedMonth) {
        // Set to first and last of month
        const [year, month] = selectedMonth.split('-').map(Number);
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      }

      // Create trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          name: tripName.trim(),
          description: tripDescription.trim() || null,
          start_date: startDate,
          end_date: endDate,
          visibility,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add locations
      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        await supabase.from('trip_locations').insert({
          trip_id: trip.id,
          custom_location: dest.name,
          arrival_date: dest.startDate || null,
          departure_date: dest.endDate || null,
          order_index: i,
        });
      }

      // Add owner as participant
      await supabase.from('trip_participants').insert({
        trip_id: trip.id,
        user_id: user.id,
        role: 'owner',
        status: 'accepted',
        joined_at: new Date().toISOString(),
      });

      // Invite selected friends
      for (const friendId of Array.from(selectedFriends)) {
        await supabase.from('trip_participants').insert({
          trip_id: trip.id,
          user_id: friendId,
          role: 'member',
          status: 'invited',
        });
      }

      onSuccess(trip.id);
    } catch (err) {
      console.error('Error creating trip:', err);
      setError('Failed to create trip. Please try again.');
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
          <p className="text-sm text-seeya-text-secondary mb-3">Pick a month</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(i);
              const monthKey = `${date.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
              const monthName = date.toLocaleString('default', { month: 'short' });
              return (
                <button
                  key={monthKey}
                  type="button"
                  onClick={() => setSelectedMonth(selectedMonth === monthKey ? null : monthKey)}
                  className={cn(
                    'py-2 px-1 rounded-lg text-sm font-medium transition-all',
                    selectedMonth === monthKey
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
              <button
                type="button"
                onClick={() => handleRemoveDestination(dest.id)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} className="text-seeya-text-secondary" />
              </button>
            </div>

            {dateMode === 'exact' && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 grid grid-cols-2 gap-3">
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
                    onChange={(e) => handleUpdateDestinationDate(dest.id, 'endDate', e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none"
                  />
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
              placeholder={destinations.length === 0 ? 'Search for a city...' : 'Add another stop...'}
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
            className="flex-1 bg-black hover:bg-gray-800"
          >
            {currentStep === 'privacy' ? 'Create Trip' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}

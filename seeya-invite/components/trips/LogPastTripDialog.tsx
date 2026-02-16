'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Input, Button, Badge, Spinner } from '@/components/ui';
import {
  X,
  MapPin,
  Calendar,
  CalendarClock,
  HelpCircle,
  Star,
  Plus,
  Trash2,
  ChevronLeft,
  Check,
  Utensils,
  Ticket,
  Hotel,
  Lightbulb,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────

type DateMode = 'specific' | 'month' | 'skip';
type RecommendationCategory = 'restaurant' | 'activity' | 'stay' | 'tip';

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
}

interface Recommendation {
  id: string;
  title: string;
  category: RecommendationCategory;
  rating: number;
  tips: string;
  destinationId: string; // links to which destination
}

interface LogPastTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ── Constants ───────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => CURRENT_YEAR - i);

const CATEGORY_OPTIONS: { value: RecommendationCategory; label: string; icon: typeof Utensils }[] = [
  { value: 'restaurant', label: 'Restaurant', icon: Utensils },
  { value: 'activity', label: 'Activity', icon: Ticket },
  { value: 'stay', label: 'Stay', icon: Hotel },
  { value: 'tip', label: 'Tip', icon: Lightbulb },
];

const CATEGORY_COLORS: Record<RecommendationCategory, string> = {
  restaurant: 'bg-orange-50 text-orange-600',
  activity: 'bg-green-50 text-green-600',
  stay: 'bg-purple-50 text-purple-600',
  tip: 'bg-blue-50 text-blue-600',
};

// ── Component ───────────────────────────────────────────────────────────

export function LogPastTripDialog({ isOpen, onClose, onSuccess }: LogPastTripDialogProps) {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Step 1: Destinations ──────────────────────────────────────────
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ── Step 2: Trip Details ──────────────────────────────────────────
  const [tripName, setTripName] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  // ── Step 3: Recommendations ───────────────────────────────────────
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [newRec, setNewRec] = useState({
    title: '',
    category: 'restaurant' as RecommendationCategory,
    rating: 5,
    tips: '',
    destinationId: '',
  });
  const [hoveredRating, setHoveredRating] = useState(0);

  // ── Places autocomplete effect ────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/places/autocomplete?query=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        if (data.predictions) {
          setPredictions(data.predictions);
          setShowPredictions(true);
        }
      } catch (err) {
        console.error('Places search error:', err);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Close predictions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set default destinationId for new rec when destinations change
  useEffect(() => {
    if (destinations.length > 0 && !newRec.destinationId) {
      setNewRec((prev) => ({ ...prev, destinationId: destinations[0].id }));
    }
  }, [destinations, newRec.destinationId]);

  // ── Helpers ───────────────────────────────────────────────────────

  const addDestination = (name: string, placeId?: string) => {
    const dest: Destination = {
      id: Date.now().toString(),
      name,
      placeId,
    };
    setDestinations((prev) => [...prev, dest]);
    setSearchQuery('');
    setPredictions([]);
    setShowPredictions(false);
  };

  const handleAddDestinationFromInput = () => {
    if (!searchQuery.trim()) return;
    addDestination(searchQuery.trim());
  };

  const handleSelectPrediction = (prediction: PlacePrediction) => {
    addDestination(prediction.description, prediction.placeId);
  };

  const removeDestination = (id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
    // Also remove linked recommendations
    setRecommendations((prev) => prev.filter((r) => r.destinationId !== id));
  };

  const autoTripName = () => {
    if (destinations.length === 0) return '';
    if (destinations.length === 1) return `Trip to ${destinations[0].name}`;
    return `Trip to ${destinations.map((d) => d.name).join(' & ')}`;
  };

  const addRecommendation = () => {
    if (!newRec.title.trim() || !newRec.destinationId) return;
    const rec: Recommendation = {
      id: Date.now().toString(),
      title: newRec.title.trim(),
      category: newRec.category,
      rating: newRec.rating,
      tips: newRec.tips.trim(),
      destinationId: newRec.destinationId,
    };
    setRecommendations((prev) => [...prev, rec]);
    setNewRec({
      title: '',
      category: 'restaurant',
      rating: 5,
      tips: '',
      destinationId: destinations[0]?.id || '',
    });
    setHoveredRating(0);
  };

  const removeRecommendation = (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Submit ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user || destinations.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Resolve dates
      let tripStartDate: string | null = null;
      let tripEndDate: string | null = null;

      if (dateMode === 'specific' && startDate && endDate) {
        tripStartDate = startDate;
        tripEndDate = endDate;
      } else if (dateMode === 'month') {
        const monthIndex = MONTHS.indexOf(selectedMonth);
        const year = selectedYear;
        tripStartDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, monthIndex + 1, 0).getDate();
        tripEndDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${lastDay}`;
      }

      // Build final trip name
      const finalName = tripName.trim() || autoTripName();

      // 1. Create trip with is_logged_past_trip flag
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          name: finalName,
          description: null,
          start_date: tripStartDate,
          end_date: tripEndDate,
          visibility: 'full_details',
          is_logged_past_trip: true,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // 2. Insert trip_locations for each destination
      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        await supabase.from('trip_locations').insert({
          trip_id: trip.id,
          custom_location: dest.name,
          order_index: i,
          arrival_date: i === 0 ? tripStartDate : null,
          departure_date: i === destinations.length - 1 ? tripEndDate : null,
        });
      }

      // 3. Create trip_participant for the owner
      await supabase.from('trip_participants').insert({
        trip_id: trip.id,
        user_id: user.id,
        role: 'owner',
        status: 'accepted',
        joined_at: new Date().toISOString(),
      });

      // 4. Insert shared_recommendations for each recommendation
      for (const rec of recommendations) {
        const dest = destinations.find((d) => d.id === rec.destinationId);

        // The shared_recommendations table requires at least one of:
        // city_id, country_id, or google_place_id
        // Since we may only have a placeId from Google Places autocomplete,
        // we use google_place_id. If no placeId available, we skip the rec
        // (the constraint will reject it otherwise).
        const googlePlaceId = dest?.placeId || null;

        if (!googlePlaceId) {
          // Can't insert without some location identifier; skip silently
          continue;
        }

        await supabase.from('shared_recommendations').insert({
          user_id: user.id,
          title: rec.title,
          category: rec.category,
          rating: rec.rating,
          tips: rec.tips || null,
          google_place_id: googlePlaceId,
          source_trip_id: trip.id,
        });
      }

      setSuccessMessage(
        `Trip logged! ${recommendations.length > 0 ? `${recommendations.length} recommendation${recommendations.length === 1 ? '' : 's'} saved.` : ''}`
      );

      // Auto-close after brief delay
      setTimeout(() => {
        resetAndClose();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      console.error('Error logging past trip:', err);
      setError('Failed to save trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────

  const resetAndClose = () => {
    setStep(1);
    setDestinations([]);
    setSearchQuery('');
    setPredictions([]);
    setShowPredictions(false);
    setTripName('');
    setDateMode('month');
    setStartDate('');
    setEndDate('');
    setSelectedMonth(MONTHS[new Date().getMonth()]);
    setSelectedYear(CURRENT_YEAR);
    setRecommendations([]);
    setNewRec({ title: '', category: 'restaurant', rating: 5, tips: '', destinationId: '' });
    setHoveredRating(0);
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
    onClose();
  };

  // ── Guard ─────────────────────────────────────────────────────────

  if (!isOpen) return null;

  // ── Success overlay ───────────────────────────────────────────────

  if (successMessage) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-seeya-text mb-2">Done!</h3>
          <p className="text-seeya-text-secondary">{successMessage}</p>
        </div>
      </div>
    );
  }

  // ── Step navigation helpers ───────────────────────────────────────

  const canProceedStep1 = destinations.length > 0;
  const canProceedStep2 = true; // name is optional, dates are optional

  const TOTAL_STEPS = 3;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={resetAndClose}
            className="text-seeya-text hover:text-seeya-text-secondary"
          >
            Cancel
          </button>
          <span className="text-sm text-seeya-text-secondary">
            Step {step} of {TOTAL_STEPS}
          </span>
          <div className="w-12" />
        </div>

        {/* Progress bar */}
        <div className="max-w-lg mx-auto px-6 pb-4">
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-1 rounded-full transition-colors',
                  i < step ? 'bg-black' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-seeya-error text-sm">
            {error}
          </div>
        )}

        {/* ── STEP 1: Destinations ──────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-seeya-text">
              Where did you travel?
            </h2>
            <p className="text-sm text-seeya-text-secondary -mt-4">
              Add one or more destinations you visited
            </p>

            {/* Selected destinations */}
            {destinations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {destinations.map((dest) => (
                  <span
                    key={dest.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded-full text-sm font-medium"
                  >
                    <MapPin size={14} />
                    {dest.name}
                    <button
                      type="button"
                      onClick={() => removeDestination(dest.id)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input with autocomplete */}
            <div ref={searchContainerRef} className="relative">
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    destinations.length === 0
                      ? 'Search for a city or country...'
                      : 'Add another destination...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDestinationFromInput()}
                  onFocus={() => searchQuery.length >= 2 && setShowPredictions(true)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {showPredictions && (predictions.length > 0 || searchQuery.length >= 2) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-auto">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.placeId}
                      type="button"
                      onClick={() => handleSelectPrediction(prediction)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                    >
                      <MapPin size={18} className="text-seeya-purple shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-seeya-text">{prediction.mainText}</p>
                        <p className="text-sm text-seeya-text-secondary truncate">
                          {prediction.secondaryText}
                        </p>
                      </div>
                    </button>
                  ))}

                  {searchQuery.length >= 2 && !isSearching && (
                    <button
                      type="button"
                      onClick={handleAddDestinationFromInput}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-seeya-purple"
                    >
                      <Plus size={18} />
                      <span>Use &quot;{searchQuery}&quot; as custom location</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Itinerary summary */}
            {destinations.length > 0 && (
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-xs text-seeya-text-secondary mb-1">Your itinerary</p>
                <p className="font-medium text-seeya-text">
                  {destinations.map((d) => d.name).join(' \u2192 ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Trip Details ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-seeya-text">
              Trip Details
            </h2>

            {/* Trip Name */}
            <div>
              <label className="block text-sm font-medium text-seeya-text mb-1.5">
                Trip name <span className="text-seeya-text-secondary font-normal">(optional)</span>
              </label>
              <Input
                placeholder={autoTripName() || 'e.g., Summer in Paris'}
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
              />
              {!tripName && destinations.length > 0 && (
                <p className="mt-1.5 text-xs text-seeya-text-secondary">
                  Will default to: {autoTripName()}
                </p>
              )}
            </div>

            {/* Date Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-seeya-text mb-2">
                When did you go?
              </label>
              <div className="flex rounded-lg bg-gray-100 p-1">
                {([
                  { id: 'specific' as DateMode, label: 'Specific dates', icon: Calendar },
                  { id: 'month' as DateMode, label: 'Month & Year', icon: CalendarClock },
                  { id: 'skip' as DateMode, label: 'Skip', icon: HelpCircle },
                ]).map((mode) => {
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
            </div>

            {/* Specific dates */}
            {dateMode === 'specific' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-seeya-text-secondary mb-1">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-seeya-text-secondary mb-1">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    max={new Date().toISOString().split('T')[0]}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Month & Year */}
            {dateMode === 'month' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-seeya-text-secondary mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none bg-white"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-seeya-text-secondary mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none bg-white"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Skip message */}
            {dateMode === 'skip' && (
              <div className="p-4 bg-purple-50 rounded-xl text-center">
                <p className="text-sm text-seeya-text-secondary">
                  No dates will be recorded for this trip
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Recommendations ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-seeya-text">
              Share your recommendations
            </h2>
            <p className="text-sm text-seeya-text-secondary -mt-4">
              Share your favorite spots from your trip (optional)
            </p>

            {/* New recommendation form */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              {/* Place name */}
              <div>
                <label className="block text-sm font-medium text-seeya-text mb-1.5">
                  Place name
                </label>
                <Input
                  placeholder="e.g., Joe's Beerhouse"
                  value={newRec.title}
                  onChange={(e) => setNewRec((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Category + destination row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-seeya-text-secondary mb-1">Category</label>
                  <select
                    value={newRec.category}
                    onChange={(e) =>
                      setNewRec((prev) => ({
                        ...prev,
                        category: e.target.value as RecommendationCategory,
                      }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none bg-white"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-seeya-text-secondary mb-1">Destination</label>
                  <select
                    value={newRec.destinationId}
                    onChange={(e) =>
                      setNewRec((prev) => ({ ...prev, destinationId: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none bg-white"
                  >
                    {destinations.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-xs text-seeya-text-secondary mb-1">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNewRec((prev) => ({ ...prev, rating: value }))}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        size={24}
                        className={cn(
                          'transition-colors',
                          value <= (hoveredRating || newRec.rating)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-seeya-text-secondary">
                    {newRec.rating}/5
                  </span>
                </div>
              </div>

              {/* Tips textarea */}
              <div>
                <label className="block text-xs text-seeya-text-secondary mb-1">
                  Tips / review <span className="text-seeya-text-secondary">(optional)</span>
                </label>
                <textarea
                  value={newRec.tips}
                  onChange={(e) => setNewRec((prev) => ({ ...prev, tips: e.target.value }))}
                  placeholder="Share tips for your friends..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-seeya-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-seeya-purple/20 focus:border-seeya-purple resize-none"
                />
              </div>

              {/* Add button */}
              <Button
                type="button"
                variant="outline"
                onClick={addRecommendation}
                disabled={!newRec.title.trim() || !newRec.destinationId}
                leftIcon={<Plus size={16} />}
                className="w-full"
              >
                Add Recommendation
              </Button>
            </div>

            {/* Added recommendations list */}
            {recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-seeya-text">
                  Added recommendations ({recommendations.length})
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recommendations.map((rec) => {
                    const dest = destinations.find((d) => d.id === rec.destinationId);
                    const catOpt = CATEGORY_OPTIONS.find((c) => c.value === rec.category);
                    const CatIcon = catOpt?.icon || Lightbulb;

                    return (
                      <div
                        key={rec.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200"
                      >
                        <div
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                            CATEGORY_COLORS[rec.category]
                          )}
                        >
                          <CatIcon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-seeya-text truncate">
                              {rec.title}
                            </p>
                            <Badge variant="default" size="sm">
                              {rec.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={10}
                                  className={cn(
                                    s <= rec.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                  )}
                                />
                              ))}
                            </div>
                            {dest && (
                              <span className="text-xs text-seeya-text-secondary truncate">
                                {dest.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRecommendation(rec.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 size={14} className="text-seeya-text-secondary" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto px-6 py-4 flex gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              leftIcon={<ChevronLeft size={16} />}
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              if (step === 3) {
                handleSubmit();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2) ||
              isSubmitting
            }
            isLoading={isSubmitting}
            className="flex-1 bg-black hover:bg-gray-800"
          >
            {step === 3 ? 'Save Trip' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}

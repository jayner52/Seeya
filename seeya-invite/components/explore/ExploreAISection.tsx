'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Spinner } from '@/components/ui';
import {
  Sparkles,
  Utensils,
  Ticket,
  Hotel,
  Lightbulb,
  Plus,
  Check,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Clock,
  Search,
  MapPin,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {
  AIRecommendation,
  RecommendationCategory,
  CategoryFilters,
  RestaurantFilters,
  ActivityFilters,
  StayFilters,
  TipFilters,
} from '@/types';
import {
  CUISINE_OPTIONS,
  MEAL_TYPE_OPTIONS,
  VIBE_OPTIONS,
  PRICE_RANGE_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  ACTIVITY_DURATION_OPTIONS,
  STAY_PROPERTY_TYPE_OPTIONS,
  TIP_TOPIC_OPTIONS,
} from '@/types';

interface ExploreAISectionProps {
  onAddToTrip: (recommendation: AIRecommendation) => void;
  addedIds: Set<string>;
}

// Category configuration
const categories: { id: RecommendationCategory; label: string; icon: typeof Utensils; color: string }[] = [
  { id: 'restaurant', label: 'Food', icon: Utensils, color: 'bg-orange-50 text-orange-600' },
  { id: 'activity', label: 'Activities', icon: Ticket, color: 'bg-green-50 text-green-600' },
  { id: 'stay', label: 'Stays', icon: Hotel, color: 'bg-purple-50 text-purple-600' },
  { id: 'tip', label: 'Tips', icon: Lightbulb, color: 'bg-blue-50 text-blue-600' },
];

const categoryConfig: Record<RecommendationCategory, { icon: typeof Utensils; label: string; color: string }> = {
  restaurant: { icon: Utensils, label: 'Food', color: 'bg-orange-50 text-orange-600' },
  activity: { icon: Ticket, label: 'Activities', color: 'bg-green-50 text-green-600' },
  stay: { icon: Hotel, label: 'Stays', color: 'bg-purple-50 text-purple-600' },
  tip: { icon: Lightbulb, label: 'Tips', color: 'bg-blue-50 text-blue-600' },
};

type CategoryCache = Partial<Record<RecommendationCategory, AIRecommendation[]>>;

function AIRecommendationCard({
  recommendation,
  isAdded,
  onAddToTrip,
}: {
  recommendation: AIRecommendation;
  isAdded: boolean;
  onAddToTrip: () => void;
}) {
  const config = categoryConfig[recommendation.category];
  const Icon = config.icon;

  return (
    <Card variant="outline" padding="none" className="overflow-hidden">
      <div className={cn('h-1.5', config.color.split(' ')[0])} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', config.color)}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-seeya-text">{recommendation.title}</h4>
            <p className="text-sm text-seeya-text-secondary mt-1 line-clamp-2">
              {recommendation.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          {recommendation.estimatedCost && (
            <div className="flex items-center gap-1 text-sm text-seeya-text-secondary">
              <DollarSign size={14} />
              <span>{recommendation.estimatedCost}</span>
            </div>
          )}
          {recommendation.bestTimeToVisit && (
            <div className="flex items-center gap-1 text-sm text-seeya-text-secondary">
              <Clock size={14} />
              <span>{recommendation.bestTimeToVisit}</span>
            </div>
          )}
        </div>

        {recommendation.tips && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-seeya-text-secondary">
              <Lightbulb size={14} className="inline mr-1 text-seeya-primary" />
              {recommendation.tips}
            </p>
          </div>
        )}

        <button
          onClick={onAddToTrip}
          disabled={isAdded}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
            isAdded
              ? 'bg-seeya-primary/20 text-yellow-700 cursor-default'
              : 'bg-seeya-primary/10 text-seeya-text hover:bg-seeya-primary/20'
          )}
        >
          {isAdded ? (
            <>
              <Check size={16} />
              <span>Added to Trip</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Add to Trip</span>
            </>
          )}
        </button>
      </div>
    </Card>
  );
}

// Filter panels (same as AIRecommendationsSection)
function RestaurantFilterPanel({
  filters,
  onChange,
}: {
  filters: RestaurantFilters;
  onChange: (filters: RestaurantFilters) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={filters.cuisine || ''}
        onChange={(e) => onChange({ ...filters, cuisine: e.target.value || undefined })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      >
        <option value="">Any cuisine</option>
        {CUISINE_OPTIONS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        value={filters.mealType || ''}
        onChange={(e) => onChange({ ...filters, mealType: e.target.value as RestaurantFilters['mealType'] || undefined })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      >
        <option value="">Any meal</option>
        {MEAL_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={filters.priceRange || ''}
        onChange={(e) => onChange({ ...filters, priceRange: e.target.value as RestaurantFilters['priceRange'] || undefined })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      >
        <option value="">Any price</option>
        {PRICE_RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={filters.vibe || ''}
        onChange={(e) => onChange({ ...filters, vibe: e.target.value as RestaurantFilters['vibe'] || undefined })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      >
        <option value="">Any vibe</option>
        {VIBE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <input
        type="text"
        value={filters.neighborhood || ''}
        onChange={(e) => onChange({ ...filters, neighborhood: e.target.value || undefined })}
        placeholder="Neighborhood"
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-32"
      />
    </div>
  );
}

function ActivityFilterPanel({
  filters,
  onChange,
}: {
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={filters.type || ''}
        onChange={(e) => onChange({ ...filters, type: e.target.value as ActivityFilters['type'] || undefined })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      >
        <option value="">Any type</option>
        {ACTIVITY_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={filters.duration || ''}
        onChange={(e) => onChange({ ...filters, duration: e.target.value as ActivityFilters['duration'] || undefined })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      >
        <option value="">Any duration</option>
        {ACTIVITY_DURATION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white cursor-pointer">
        <input
          type="checkbox"
          checked={filters.kidFriendly || false}
          onChange={(e) => onChange({ ...filters, kidFriendly: e.target.checked || undefined })}
          className="rounded border-gray-300"
        />
        <span>Kid-friendly</span>
      </label>
    </div>
  );
}

function StayFilterPanel({
  filters,
  onChange,
}: {
  filters: StayFilters;
  onChange: (filters: StayFilters) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={filters.propertyType || ''}
        onChange={(e) => onChange({ ...filters, propertyType: e.target.value as StayFilters['propertyType'] || undefined })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      >
        <option value="">Any type</option>
        {STAY_PROPERTY_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={filters.priceRange || ''}
        onChange={(e) => onChange({ ...filters, priceRange: e.target.value as StayFilters['priceRange'] || undefined })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      >
        <option value="">Any price</option>
        {PRICE_RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <input
        type="text"
        value={filters.neighborhood || ''}
        onChange={(e) => onChange({ ...filters, neighborhood: e.target.value || undefined })}
        placeholder="Neighborhood"
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-32"
      />
    </div>
  );
}

function TipFilterPanel({
  filters,
  onChange,
}: {
  filters: TipFilters;
  onChange: (filters: TipFilters) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={filters.topic || ''}
        onChange={(e) => onChange({ ...filters, topic: e.target.value as TipFilters['topic'] || undefined })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
      >
        <option value="">Any topic</option>
        {TIP_TOPIC_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

export function ExploreAISection({ onAddToTrip, addedIds }: ExploreAISectionProps) {
  const { user } = useAuthStore();

  // Destination search
  const [destination, setDestination] = useState('');
  const [searchedDestination, setSearchedDestination] = useState('');

  // Places autocomplete
  const [placePredictions, setPlacePredictions] = useState<PlacePrediction[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const predictionsRef = useRef<HTMLDivElement>(null);

  // Places autocomplete effect
  useEffect(() => {
    if (!destination.trim() || destination.length < 2) {
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
        const response = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(destination)}`);
        const data = await response.json();
        if (data.predictions) {
          setPlacePredictions(data.predictions);
          setShowPredictions(true);
        }
      } catch {
        setPlacePredictions([]);
      }
      setIsSearchingPlaces(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [destination]);

  // Close predictions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (predictionsRef.current && !predictionsRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectPrediction = (prediction: PlacePrediction) => {
    setDestination(prediction.mainText);
    setShowPredictions(false);
    setPlacePredictions([]);

    // Auto-trigger AI search with the selected place
    setSearchedDestination(prediction.mainText);
    setCache({});
    setErrors({});
    generateRecommendations(activeCategory, prediction.mainText, true);
  };

  // Category and loading
  const [activeCategory, setActiveCategory] = useState<RecommendationCategory>('restaurant');
  const [loadingCategory, setLoadingCategory] = useState<RecommendationCategory | null>(null);
  const [errors, setErrors] = useState<Partial<Record<RecommendationCategory, string>>>({});
  const [cache, setCache] = useState<CategoryCache>({});

  // Filters
  const [filters, setFilters] = useState<{
    restaurant: RestaurantFilters;
    activity: ActivityFilters;
    stay: StayFilters;
    tip: TipFilters;
  }>({
    restaurant: {},
    activity: {},
    stay: {},
    tip: {},
  });
  const [showFilters, setShowFilters] = useState(false);

  const currentRecommendations = cache[activeCategory] || [];
  const isLoading = loadingCategory === activeCategory;
  const currentError = errors[activeCategory];

  const hasActiveFilters = useCallback((cat: RecommendationCategory) => {
    const f = filters[cat];
    return Object.values(f).some(v => v !== undefined && v !== '' && v !== false);
  }, [filters]);

  const handleSearch = async () => {
    if (!destination.trim()) return;

    setSearchedDestination(destination.trim());
    setCache({});
    setErrors({});

    // Generate first category
    await generateRecommendations(activeCategory, destination.trim(), true);
  };

  const generateRecommendations = async (
    category: RecommendationCategory,
    dest: string,
    forceRefresh = false
  ) => {
    if (!dest) return;

    if (!forceRefresh && cache[category]?.length) {
      return;
    }

    setLoadingCategory(category);
    setErrors(prev => ({ ...prev, [category]: undefined }));

    try {
      // Call the API directly (no tripId needed for explore)
      const response = await fetch('/api/explore/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: dest,
          category,
          count: 4,
          filters: filters[category],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Failed to generate recommendations');
      }

      const result = await response.json();
      setCache(prev => ({ ...prev, [category]: result.recommendations }));
    } catch (err) {
      console.error(`Error generating ${category} recommendations:`, err);
      setErrors(prev => ({
        ...prev,
        [category]: err instanceof Error ? err.message : 'Failed to generate recommendations',
      }));
    } finally {
      setLoadingCategory(null);
    }
  };

  const handleTabChange = (category: RecommendationCategory) => {
    setActiveCategory(category);
    if (searchedDestination && !cache[category]?.length && !errors[category]) {
      generateRecommendations(category, searchedDestination);
    }
  };

  const handleRefresh = () => {
    setCache(prev => ({ ...prev, [activeCategory]: undefined }));
    generateRecommendations(activeCategory, searchedDestination, true);
  };

  const handleFilterChange = (category: RecommendationCategory, newFilters: CategoryFilters) => {
    setFilters(prev => ({ ...prev, [category]: newFilters }));
  };

  const handleApplyFilters = () => {
    setCache(prev => ({ ...prev, [activeCategory]: undefined }));
    generateRecommendations(activeCategory, searchedDestination, true);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters(prev => ({ ...prev, [activeCategory]: {} }));
    setCache(prev => ({ ...prev, [activeCategory]: undefined }));
    generateRecommendations(activeCategory, searchedDestination, true);
    setShowFilters(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-seeya-purple" />
        <h3 className="text-lg font-semibold text-seeya-text">
          AI Travel Recommendations
        </h3>
      </div>

      {/* Destination Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative" ref={predictionsRef}>
          <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-seeya-text-secondary z-10" />
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setShowPredictions(false);
                handleSearch();
              }
            }}
            onFocus={() => {
              if (placePredictions.length > 0) setShowPredictions(true);
            }}
            placeholder="Search any destination..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-seeya-purple focus:border-transparent"
          />

          {/* Places autocomplete dropdown */}
          {showPredictions && (placePredictions.length > 0 || isSearchingPlaces) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-auto">
              {isSearchingPlaces && placePredictions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-seeya-text-secondary text-center">
                  Searching...
                </div>
              ) : (
                placePredictions.map((prediction) => (
                  <button
                    key={prediction.placeId}
                    type="button"
                    onClick={() => handleSelectPrediction(prediction)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                  >
                    <MapPin size={16} className="text-seeya-purple shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-seeya-text">{prediction.mainText}</p>
                      <p className="text-xs text-seeya-text-secondary">{prediction.secondaryText}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <Button
          variant="purple"
          onClick={() => {
            setShowPredictions(false);
            handleSearch();
          }}
          disabled={!destination.trim()}
          className="px-6"
        >
          <Search size={18} />
        </Button>
      </div>

      {/* Results */}
      {searchedDestination ? (
        <div className="space-y-4">
          {/* Destination badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-seeya-text-secondary">Showing recommendations for:</span>
            <span className="px-3 py-1 bg-purple-100 text-seeya-purple rounded-full text-sm font-medium">
              {searchedDestination}
            </span>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              const hasResults = (cache[cat.id]?.length || 0) > 0;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleTabChange(cat.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white shadow text-seeya-purple'
                      : 'text-seeya-text-secondary hover:text-seeya-text'
                  )}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{cat.label}</span>
                  {hasResults && (
                    <span className={cn(
                      'ml-1 px-1.5 py-0.5 rounded-full text-xs',
                      isActive ? 'bg-seeya-purple/10 text-seeya-purple' : 'bg-gray-200 text-gray-600'
                    )}>
                      {cache[cat.id]?.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filters Toggle & Panel */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  showFilters || hasActiveFilters(activeCategory)
                    ? 'bg-seeya-purple/10 text-seeya-purple'
                    : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
                )}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {hasActiveFilters(activeCategory) && (
                  <span className="w-2 h-2 rounded-full bg-seeya-purple" />
                )}
              </button>

              {hasActiveFilters(activeCategory) && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-seeya-text-secondary hover:text-seeya-text"
                >
                  <X size={12} />
                  Clear
                </button>
              )}

              <div className="flex-1" />

              {currentRecommendations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="gap-1 text-seeya-text-secondary"
                >
                  <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
                  Refresh
                </Button>
              )}
            </div>

            {showFilters && (
              <Card variant="outline" padding="sm" className="space-y-3">
                {activeCategory === 'restaurant' && (
                  <RestaurantFilterPanel
                    filters={filters.restaurant}
                    onChange={(f) => handleFilterChange('restaurant', f)}
                  />
                )}
                {activeCategory === 'activity' && (
                  <ActivityFilterPanel
                    filters={filters.activity}
                    onChange={(f) => handleFilterChange('activity', f)}
                  />
                )}
                {activeCategory === 'stay' && (
                  <StayFilterPanel
                    filters={filters.stay}
                    onChange={(f) => handleFilterChange('stay', f)}
                  />
                )}
                {activeCategory === 'tip' && (
                  <TipFilterPanel
                    filters={filters.tip}
                    onChange={(f) => handleFilterChange('tip', f)}
                  />
                )}

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                    Cancel
                  </Button>
                  <Button variant="purple" size="sm" onClick={handleApplyFilters}>
                    Apply Filters
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Content Area */}
          {isLoading ? (
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <div>
                  <h3 className="text-lg font-semibold text-seeya-text mb-1">
                    Finding {categoryConfig[activeCategory].label.toLowerCase()}...
                  </h3>
                  <p className="text-sm text-seeya-text-secondary">
                    AI is searching for the best options in {searchedDestination}
                  </p>
                </div>
              </div>
            </Card>
          ) : currentError ? (
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-seeya-error" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-seeya-text mb-1">
                    Couldn&apos;t get recommendations
                  </h3>
                  <p className="text-sm text-seeya-text-secondary max-w-sm">
                    {currentError}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => generateRecommendations(activeCategory, searchedDestination, true)}
                  className="gap-2"
                >
                  <RefreshCw size={18} />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : currentRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentRecommendations.map(recommendation => (
                <AIRecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  isAdded={addedIds.has(recommendation.id)}
                  onAddToTrip={() => onAddToTrip(recommendation)}
                />
              ))}
            </div>
          ) : (
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center',
                  categoryConfig[activeCategory].color
                )}>
                  {(() => {
                    const Icon = categoryConfig[activeCategory].icon;
                    return <Icon className="w-8 h-8" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-seeya-text mb-1">
                    Get {categoryConfig[activeCategory].label} Recommendations
                  </h3>
                  <p className="text-sm text-seeya-text-secondary max-w-sm">
                    {activeCategory === 'restaurant' && 'Discover the best restaurants and local dining spots.'}
                    {activeCategory === 'activity' && 'Find unique activities and experiences.'}
                    {activeCategory === 'stay' && 'Get accommodation suggestions.'}
                    {activeCategory === 'tip' && 'Get practical travel tips and local insights.'}
                  </p>
                </div>
                <Button
                  variant="purple"
                  onClick={() => generateRecommendations(activeCategory, searchedDestination)}
                  className="gap-2"
                >
                  <Sparkles size={18} />
                  Get Suggestions
                </Button>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card variant="elevated" padding="lg" className="text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-seeya-purple/20 to-purple-200 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-seeya-purple" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-seeya-text mb-1">
                Explore Any Destination
              </h3>
              <p className="text-sm text-seeya-text-secondary max-w-sm">
                Search for a city or destination to get AI-powered recommendations for restaurants, activities, stays, and local tips.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

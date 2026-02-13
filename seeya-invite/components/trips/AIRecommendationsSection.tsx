'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Spinner } from '@/components/ui';
import { generateCategoryRecommendations, saveRecommendationAsTripBit } from '@/lib/api/recommendations';
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
  ChevronDown,
  SlidersHorizontal,
  X,
  Star,
  MapPin,
  ExternalLink,
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
import type { TripLocation } from '@/types/database';
import { getLocationDisplayName } from '@/types/database';

interface AIRecommendationsSectionProps {
  tripId: string;
  locations: TripLocation[];
  startDate?: string | null;
  endDate?: string | null;
  onTripBitAdded?: () => void;
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

// Cache type for storing recommendations per category
type CategoryCache = Partial<Record<RecommendationCategory, AIRecommendation[]>>;

function RecommendationCard({
  recommendation,
  isAdded,
  isAdding,
  onAdd,
}: {
  recommendation: AIRecommendation;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
}) {
  const config = categoryConfig[recommendation.category];
  const Icon = config.icon;
  const hasPhoto = !!recommendation.photoUrl;
  const isTip = recommendation.category === 'tip';

  return (
    <Card variant="outline" padding="none" className="overflow-hidden">
      {/* Photo or color bar */}
      {hasPhoto ? (
        <div className="relative h-40 bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recommendation.photoUrl}
            alt={recommendation.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className={cn(
            'absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 bg-white/90',
            config.color
          )}>
            <Icon size={12} />
            {config.label}
          </div>
        </div>
      ) : (
        <div className={cn('h-1.5', config.color.split(' ')[0])} />
      )}

      <div className="p-4">
        {/* Title row */}
        <div className={cn('mb-2', !hasPhoto && 'flex items-start gap-3')}>
          {!hasPhoto && (
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', config.color)}>
              <Icon size={20} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-seeya-text">{recommendation.title}</h4>
              {recommendation.googleMapsUrl && (
                <a
                  href={recommendation.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-seeya-text-secondary hover:text-seeya-purple shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            {/* Rating + address */}
            {!isTip && (recommendation.rating || recommendation.address) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {recommendation.rating && (
                  <div className="flex items-center gap-1">
                    <Star size={13} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium text-seeya-text">{recommendation.rating}</span>
                    {recommendation.userRatingsTotal != null && (
                      <span className="text-xs text-seeya-text-secondary">
                        ({Number(recommendation.userRatingsTotal).toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
                {recommendation.address && (
                  <div className="flex items-center gap-1 text-xs text-seeya-text-secondary min-w-0">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{recommendation.address}</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-seeya-text-secondary mt-1.5 line-clamp-2">
              {recommendation.description}
            </p>
          </div>
        </div>

        {/* Cost and time info */}
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

        {/* Tips */}
        {recommendation.tips && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-seeya-text-secondary">
              <Lightbulb size={14} className="inline mr-1 text-seeya-primary" />
              {recommendation.tips}
            </p>
          </div>
        )}

        {/* Add button */}
        <button
          onClick={onAdd}
          disabled={isAdded || isAdding}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
            isAdded
              ? 'bg-seeya-primary/20 text-yellow-700 cursor-default'
              : 'bg-seeya-primary/10 text-seeya-text hover:bg-seeya-primary/20'
          )}
        >
          {isAdding ? (
            <Spinner size="sm" />
          ) : isAdded ? (
            <>
              <Check size={16} />
              <span>Added to Trip</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Add to Trip Pack</span>
            </>
          )}
        </button>
      </div>
    </Card>
  );
}

// Filter components for each category
function RestaurantFilterPanel({
  filters,
  onChange,
}: {
  filters: RestaurantFilters;
  onChange: (filters: RestaurantFilters) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Cuisine */}
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

      {/* Meal Type */}
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

      {/* Price Range */}
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

      {/* Vibe */}
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

      {/* Neighborhood (free text) */}
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
      {/* Type */}
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

      {/* Duration */}
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

      {/* Kid Friendly */}
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
      {/* Property Type */}
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

      {/* Price Range */}
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

      {/* Neighborhood (free text) */}
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
      {/* Topic */}
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

export function AIRecommendationsSection({
  tripId,
  locations,
  startDate,
  endDate,
  onTripBitAdded,
}: AIRecommendationsSectionProps) {
  const { user } = useAuthStore();

  // Active category tab
  const [activeCategory, setActiveCategory] = useState<RecommendationCategory>('restaurant');

  // Loading state per category
  const [loadingCategory, setLoadingCategory] = useState<RecommendationCategory | null>(null);

  // Error state per category
  const [errors, setErrors] = useState<Partial<Record<RecommendationCategory, string>>>({});

  // Cache recommendations per category
  const [cache, setCache] = useState<CategoryCache>({});

  // Filters per category
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

  // Show filters panel
  const [showFilters, setShowFilters] = useState(false);

  // Added items tracking
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  // Multi-city support
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    locations.length > 0 ? locations[0].id : null
  );
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Derived values
  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const destination = selectedLocation ? getLocationDisplayName(selectedLocation) : '';
  const hasMultipleLocations = locations.length > 1;

  // Get current category's recommendations
  const currentRecommendations = cache[activeCategory] || [];
  const isLoading = loadingCategory === activeCategory;
  const currentError = errors[activeCategory];

  // Check if current filters have any values
  const hasActiveFilters = useCallback((cat: RecommendationCategory) => {
    const f = filters[cat];
    return Object.values(f).some(v => v !== undefined && v !== '' && v !== false);
  }, [filters]);

  const handleGenerate = async (category: RecommendationCategory, forceRefresh = false) => {
    if (!destination) {
      setErrors(prev => ({ ...prev, [category]: 'This trip needs a destination to get recommendations' }));
      return;
    }

    // Don't regenerate if we have cached results (unless forced)
    if (!forceRefresh && cache[category]?.length) {
      return;
    }

    setLoadingCategory(category);
    setErrors(prev => ({ ...prev, [category]: undefined }));

    try {
      const result = await generateCategoryRecommendations(
        tripId,
        destination,
        category,
        {
          count: 4,
          filters: filters[category],
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }
      );

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
    // Don't auto-generate - user must click "Get Suggestions" button
  };

  const handleRefresh = () => {
    // Clear cache for current category and regenerate
    setCache(prev => ({ ...prev, [activeCategory]: undefined }));
    handleGenerate(activeCategory, true);
  };

  const handleFilterChange = (category: RecommendationCategory, newFilters: CategoryFilters) => {
    setFilters(prev => ({ ...prev, [category]: newFilters }));
  };

  const handleApplyFilters = () => {
    // Clear cache so next generate uses new filters, but don't auto-generate
    setCache(prev => ({ ...prev, [activeCategory]: undefined }));
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters(prev => ({
      ...prev,
      [activeCategory]: {},
    }));
    setCache(prev => ({ ...prev, [activeCategory]: undefined }));
    setShowFilters(false);
  };

  const handleAddToTrip = async (recommendation: AIRecommendation) => {
    if (!user || addedIds.has(recommendation.id)) return;

    setAddingId(recommendation.id);

    const result = await saveRecommendationAsTripBit(tripId, user.id, recommendation);

    if (result.success) {
      setAddedIds(prev => new Set([...Array.from(prev), recommendation.id]));
      onTripBitAdded?.();
    } else {
      console.error('Failed to add recommendation:', result.error);
    }

    setAddingId(null);
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    setShowLocationDropdown(false);
    // Reset everything when location changes
    setCache({});
    setErrors({});
    setAddedIds(new Set());
  };

  // Location dropdown component
  const LocationDropdown = () => {
    if (!hasMultipleLocations) return null;

    return (
      <div className="relative">
        <button
          onClick={() => setShowLocationDropdown(!showLocationDropdown)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors"
        >
          <span className="truncate max-w-[200px]">{destination}</span>
          <ChevronDown size={16} className={cn('transition-transform', showLocationDropdown && 'rotate-180')} />
        </button>
        {showLocationDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowLocationDropdown(false)}
            />
            <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] py-1">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => handleLocationChange(loc.id)}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors',
                    loc.id === selectedLocationId && 'bg-purple-50 text-seeya-purple font-medium'
                  )}
                >
                  {getLocationDisplayName(loc)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // No destination state
  if (!destination && locations.length === 0) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-seeya-purple/20 to-purple-200 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-seeya-purple" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-seeya-text mb-1">
              AI Recommendations
            </h3>
            <p className="text-sm text-seeya-text-secondary max-w-sm">
              Add a destination to your trip to get personalized AI recommendations.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-seeya-purple" />
          <h3 className="text-lg font-semibold text-seeya-text">
            AI Recommendations
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {hasMultipleLocations && <LocationDropdown />}
        </div>
      </div>

      {/* Destination display for single location */}
      {!hasMultipleLocations && destination && (
        <p className="text-sm text-seeya-text-secondary">
          Personalized suggestions for {destination}
        </p>
      )}

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

        {/* Filter Panel */}
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
                AI is searching for the best options in {destination}
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
              onClick={() => handleGenerate(activeCategory, true)}
              className="gap-2"
            >
              <RefreshCw size={18} />
              Try Again
            </Button>
          </div>
        </Card>
      ) : currentRecommendations.length === 0 ? (
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
                {activeCategory === 'stay' && 'Get accommodation suggestions for your trip.'}
                {activeCategory === 'tip' && 'Get practical travel tips and local insights.'}
              </p>
            </div>
            <Button
              variant="purple"
              onClick={() => handleGenerate(activeCategory)}
              className="gap-2"
            >
              <Sparkles size={18} />
              Get Suggestions
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentRecommendations.map(recommendation => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              isAdded={addedIds.has(recommendation.id)}
              isAdding={addingId === recommendation.id}
              onAdd={() => handleAddToTrip(recommendation)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

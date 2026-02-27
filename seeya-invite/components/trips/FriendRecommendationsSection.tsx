'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Badge, Avatar, Spinner } from '@/components/ui';
import {
  Users,
  Utensils,
  Ticket,
  Hotel,
  Lightbulb,
  Star,
  Bookmark,
  BookmarkCheck,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import type { TripLocation, TripBitCategory } from '@/types/database';

type RecommendationCategory = 'restaurant' | 'activity' | 'stay' | 'tip';

interface FriendRecommendation {
  id: string;
  user_id: string;
  city_id: string | null;
  country_id: string | null;
  title: string;
  description: string | null;
  category: RecommendationCategory;
  rating: number | null;
  tips: string | null;
  url: string | null;
  google_place_id: string | null;
  source_trip_id: string | null;
  source_resource_id: string | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  city: {
    id: string;
    name: string;
  } | null;
  country: {
    id: string;
    name: string;
  } | null;
}

interface FriendRecommendationsSectionProps {
  tripId: string;
  tripLocations: TripLocation[];
  onTripBitAdded?: () => void;
}

const categoryConfig: Record<
  RecommendationCategory,
  { icon: typeof Utensils; label: string; color: string; bgColor: string }
> = {
  restaurant: { icon: Utensils, label: 'Restaurants', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  activity: { icon: Ticket, label: 'Activities', color: 'text-green-600', bgColor: 'bg-green-50' },
  stay: { icon: Hotel, label: 'Stays', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  tip: { icon: Lightbulb, label: 'Tips', color: 'text-blue-600', bgColor: 'bg-blue-50' },
};

function mapRecCategoryToTripBitCategory(category: RecommendationCategory): TripBitCategory {
  switch (category) {
    case 'restaurant':
      return 'dining';
    case 'activity':
      return 'activity';
    case 'stay':
      return 'stay';
    case 'tip':
      return 'other';
    default:
      return 'other';
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={12}
          className={cn(
            value <= rating
              ? 'text-yellow-500 fill-yellow-500'
              : 'text-gray-300'
          )}
        />
      ))}
    </div>
  );
}

function FriendRecCard({
  recommendation,
  isSaved,
  isSaving,
  isAdded,
  isAdding,
  onSave,
  onAddToTrip,
}: {
  recommendation: FriendRecommendation;
  isSaved: boolean;
  isSaving: boolean;
  isAdded: boolean;
  isAdding: boolean;
  onSave: () => void;
  onAddToTrip: () => void;
}) {
  const config = categoryConfig[recommendation.category] ?? categoryConfig['tip'];
  const Icon = config.icon;

  return (
    <Card variant="outline" padding="none" className="overflow-hidden">
      <div className={cn('h-1', config.bgColor)} />
      <div className="p-4">
        {/* Author */}
        <div className="flex items-center gap-2 mb-3">
          <Avatar
            name={recommendation.profile.full_name || 'Unknown'}
            avatarUrl={recommendation.profile.avatar_url}
            size="xs"
          />
          <span className="text-xs text-seeya-text-secondary">
            From {recommendation.profile.full_name || 'A Friend'}
          </span>
        </div>

        {/* Title + Category */}
        <div className="flex items-start gap-3 mb-2">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', config.bgColor)}>
            <Icon size={18} className={config.color} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-seeya-text text-sm">
              {recommendation.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge size="sm" className={cn(config.bgColor, config.color)}>
                {config.label.replace(/s$/, '')}
              </Badge>
              {recommendation.rating && recommendation.rating > 0 && (
                <StarRating rating={recommendation.rating} />
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        {recommendation.city && (
          <div className="flex items-center gap-1 mb-2 text-xs text-seeya-text-secondary">
            <MapPin size={11} className="shrink-0" />
            <span>
              {recommendation.city.name}
              {recommendation.country && `, ${recommendation.country.name}`}
            </span>
          </div>
        )}

        {/* Tips preview */}
        {recommendation.tips && (
          <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
            <p className="text-xs text-seeya-text-secondary line-clamp-2">
              <Lightbulb size={11} className="inline mr-1 text-seeya-primary" />
              {recommendation.tips}
            </p>
          </div>
        )}

        {/* Description preview */}
        {!recommendation.tips && recommendation.description && (
          <p className="text-xs text-seeya-text-secondary line-clamp-2 mb-3">
            {recommendation.description}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={isSaved || isSaving}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              isSaved
                ? 'bg-seeya-purple/10 text-seeya-purple'
                : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
            )}
          >
            {isSaved ? (
              <>
                <BookmarkCheck size={14} />
                Saved
              </>
            ) : isSaving ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Bookmark size={14} />
                Save
              </>
            )}
          </button>

          <button
            onClick={onAddToTrip}
            disabled={isAdded || isAdding}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              isAdded
                ? 'bg-seeya-primary/20 text-yellow-700'
                : 'bg-seeya-primary/10 text-seeya-text hover:bg-seeya-primary/20'
            )}
          >
            {isAdding ? (
              <Spinner size="sm" />
            ) : isAdded ? (
              <>
                <Check size={14} />
                Added to Trip
              </>
            ) : (
              <>
                <Plus size={14} />
                Add to Trip
              </>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}

export function FriendRecommendationsSection({
  tripId,
  tripLocations,
  onTripBitAdded,
}: FriendRecommendationsSectionProps) {
  const { user } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<FriendRecommendation[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  // Extract city_ids from trip locations
  const cityIds = tripLocations
    .filter((l) => l.city_id)
    .map((l) => l.city_id as string);

  const fetchRecommendations = useCallback(async () => {
    if (!user || cityIds.length === 0) {
      setRecommendations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('shared_recommendations')
        .select(`
          *,
          profile:profiles!shared_recommendations_user_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          city:cities (
            id,
            name
          ),
          country:countries (
            id,
            name
          )
        `)
        .in('city_id', cityIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching friend recommendations:', error);
        setRecommendations([]);
      } else {
        setRecommendations((data || []) as unknown as FriendRecommendation[]);
      }

      // Fetch which recommendations the user has already saved
      const { data: savedData } = await supabase
        .from('saved_recommendations')
        .select('shared_recommendation_id')
        .eq('user_id', user.id);

      if (savedData) {
        setSavedIds(new Set(savedData.map((s) => s.shared_recommendation_id)));
      }
    } catch (err) {
      console.error('Error fetching friend recommendations:', err);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cityIds.join(',')]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleSave = async (recId: string) => {
    if (!user || savedIds.has(recId)) return;

    setSavingId(recId);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('saved_recommendations')
        .insert({
          user_id: user.id,
          shared_recommendation_id: recId,
        });

      if (!error) {
        setSavedIds((prev) => new Set([...Array.from(prev), recId]));
      }
    } catch (err) {
      console.error('Error saving recommendation:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleAddToTrip = async (rec: FriendRecommendation) => {
    if (!user || addedIds.has(rec.id)) return;

    setAddingId(rec.id);

    try {
      const supabase = createClient();

      // Build notes from recommendation details
      const notesParts: string[] = [];
      if (rec.description) notesParts.push(rec.description);
      if (rec.tips) notesParts.push(`Tip from ${rec.profile.full_name || 'a friend'}: ${rec.tips}`);
      if (rec.rating) notesParts.push(`Rating: ${rec.rating}/5`);

      const { error } = await supabase.from('trip_bits').insert({
        trip_id: tripId,
        created_by: user.id,
        category: mapRecCategoryToTripBitCategory(rec.category),
        title: rec.title,
        notes: notesParts.join('\n\n') || null,
        is_booked: false,
      });

      if (!error) {
        setAddedIds((prev) => new Set([...Array.from(prev), rec.id]));
        onTripBitAdded?.();
      }
    } catch (err) {
      console.error('Error adding recommendation to trip:', err);
    } finally {
      setAddingId(null);
    }
  };

  // Group recommendations by category
  const grouped = recommendations.reduce(
    (acc, rec) => {
      const cat = rec.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(rec);
      return acc;
    },
    {} as Record<RecommendationCategory, FriendRecommendation[]>
  );

  const categoryOrder: RecommendationCategory[] = ['restaurant', 'activity', 'stay', 'tip'];
  const filledCategories = categoryOrder.filter((cat) => grouped[cat]?.length > 0);

  // Don't render anything if loading with no city data
  if (cityIds.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-2">
          <Users size={20} className="text-seeya-purple" />
          <h3 className="text-lg font-semibold text-seeya-text">
            From Your Circle
          </h3>
          {recommendations.length > 0 && (
            <span className="text-sm text-seeya-text-secondary">
              ({recommendations.length})
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown size={20} className="text-seeya-text-secondary" />
        ) : (
          <ChevronRight size={20} className="text-seeya-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <>
          {isLoading ? (
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="flex flex-col items-center gap-3">
                <Spinner size="md" />
                <p className="text-sm text-seeya-text-secondary">
                  Looking for recommendations from friends...
                </p>
              </div>
            </Card>
          ) : recommendations.length === 0 ? (
            <Card variant="outline" padding="md" className="text-center py-8">
              <Users size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-seeya-text-secondary text-sm">
                No recommendations from friends for these destinations yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                When your travel pals share recommendations, they will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-5">
              {filledCategories.map((cat) => {
                const config = categoryConfig[cat];
                const CatIcon = config.icon;
                const recs = grouped[cat];

                return (
                  <div key={cat}>
                    {/* Category label */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn('w-6 h-6 rounded flex items-center justify-center', config.bgColor)}>
                        <CatIcon size={14} className={config.color} />
                      </div>
                      <span className="text-sm font-medium text-seeya-text">
                        {config.label}
                      </span>
                      <span className="text-xs text-seeya-text-secondary">
                        ({recs.length})
                      </span>
                    </div>

                    {/* Recommendation cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recs.map((rec) => (
                        <FriendRecCard
                          key={rec.id}
                          recommendation={rec}
                          isSaved={savedIds.has(rec.id)}
                          isSaving={savingId === rec.id}
                          isAdded={addedIds.has(rec.id)}
                          isAdding={addingId === rec.id}
                          onSave={() => handleSave(rec.id)}
                          onAddToTrip={() => handleAddToTrip(rec)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

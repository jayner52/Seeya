'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button } from '@/components/ui';
import {
  Star,
  X,
  Share2,
  CheckCircle2,
  Utensils,
  Ticket,
  Hotel,
  Lightbulb,
} from 'lucide-react';
import type { TripBit, TripLocation, TripBitCategory } from '@/types/database';

type RecommendationCategory = 'restaurant' | 'activity' | 'stay' | 'tip';

interface RateShareModalProps {
  tripBit: TripBit;
  tripId: string;
  tripLocations: TripLocation[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const categoryIcons: Record<RecommendationCategory, typeof Utensils> = {
  restaurant: Utensils,
  activity: Ticket,
  stay: Hotel,
  tip: Lightbulb,
};

const categoryLabels: Record<RecommendationCategory, string> = {
  restaurant: 'Restaurant',
  activity: 'Activity',
  stay: 'Stay',
  tip: 'Tip',
};

function mapTripBitCategory(category: TripBitCategory): RecommendationCategory {
  switch (category) {
    case 'dining':
    case 'reservation':
    case 'restaurant':
      return 'restaurant';
    case 'activity':
      return 'activity';
    case 'stay':
    case 'hotel':
      return 'stay';
    default:
      return 'tip';
  }
}

export function RateShareModal({
  tripBit,
  tripId,
  tripLocations,
  isOpen,
  onClose,
  onSuccess,
}: RateShareModalProps) {
  const { user } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [tips, setTips] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recCategory = mapTripBitCategory(tripBit.category);
  const CategoryIcon = categoryIcons[recCategory];

  // Resolve city_id and country_id from the trip bit's location or first trip location
  const resolveLocation = (): { city_id: string | null; country_id: string | null } => {
    // Try to find the location matching the trip bit's location_id
    if (tripBit.location_id) {
      const loc = tripLocations.find(l => l.id === tripBit.location_id);
      if (loc) {
        return {
          city_id: loc.city_id || null,
          country_id: loc.country_id || null,
        };
      }
    }

    // Fall back to the first trip location
    if (tripLocations.length > 0) {
      const firstLoc = tripLocations[0];
      return {
        city_id: firstLoc.city_id || null,
        country_id: firstLoc.country_id || null,
      };
    }

    return { city_id: null, country_id: null };
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { city_id, country_id } = resolveLocation();

      // Extract google_place_id from trip bit metadata if available
      const googlePlaceId =
        (tripBit.metadata?.google_place_id as string) ||
        (tripBit.metadata?.place_id as string) ||
        null;

      const { error: insertError } = await supabase
        .from('shared_recommendations')
        .insert({
          user_id: user.id,
          title: tripBit.title,
          category: recCategory,
          rating,
          tips: tips.trim() || null,
          city_id,
          country_id,
          google_place_id: googlePlaceId,
          source_trip_id: tripId,
          source_resource_id: tripBit.id,
        });

      if (insertError) {
        throw insertError;
      }

      setIsShared(true);
      onSuccess?.();
    } catch (err: unknown) {
      console.error('Error sharing recommendation:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to share recommendation'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setRating(0);
    setHoveredRating(0);
    setTips('');
    setIsShared(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <Card
        variant="elevated"
        padding="none"
        className="relative z-10 w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-seeya-purple" />
            <h3 className="font-semibold text-seeya-text">Rate & Share</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-seeya-text-secondary" />
          </button>
        </div>

        {isShared ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-seeya-success" />
            </div>
            <h4 className="text-lg font-semibold text-seeya-text mb-1">
              Shared to Your Profile
            </h4>
            <p className="text-sm text-seeya-text-secondary mb-6">
              Your friends can now see this recommendation.
            </p>
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          /* Form */
          <div className="p-4 space-y-5">
            {/* Trip Bit Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  recCategory === 'restaurant' && 'bg-orange-50 text-orange-600',
                  recCategory === 'activity' && 'bg-green-50 text-green-600',
                  recCategory === 'stay' && 'bg-purple-50 text-purple-600',
                  recCategory === 'tip' && 'bg-blue-50 text-blue-600'
                )}
              >
                <CategoryIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-seeya-text truncate">
                  {tripBit.title}
                </h4>
                <p className="text-sm text-seeya-text-secondary">
                  {categoryLabels[recCategory]}
                </p>
              </div>
            </div>

            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-seeya-text mb-2">
                Your Rating
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      size={28}
                      className={cn(
                        'transition-colors',
                        value <= (hoveredRating || rating)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      )}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-seeya-text-secondary">
                    {rating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Tips / Review */}
            <div>
              <label className="block text-sm font-medium text-seeya-text mb-2">
                Tips or Review
                <span className="text-seeya-text-tertiary font-normal ml-1">
                  (optional)
                </span>
              </label>
              <textarea
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                placeholder="Share tips for your friends..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-seeya-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-seeya-purple/30 focus:border-seeya-purple resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-seeya-error">{error}</p>
            )}

            {/* Submit Button */}
            <Button
              variant="purple"
              className="w-full gap-2"
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              isLoading={isSubmitting}
            >
              <Share2 size={16} />
              Share to Profile
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

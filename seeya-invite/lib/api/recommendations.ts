import { createClient } from '@/lib/supabase/client';
import type {
  AIRecommendation,
  RecommendationCategory,
  CategoryRecommendationsResponse,
  CategoryFilters,
} from '@/types';
import type { TripBitCategory } from '@/types/database';

// Generate recommendations for a single category with optional filters
export async function generateCategoryRecommendations(
  tripId: string,
  destination: string,
  category: RecommendationCategory,
  options?: {
    count?: number;
    filters?: CategoryFilters;
    startDate?: string;
    endDate?: string;
  }
): Promise<CategoryRecommendationsResponse> {
  const response = await fetch(`/api/trips/${tripId}/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destination,
      category,
      count: options?.count ?? 4,
      filters: options?.filters,
      startDate: options?.startDate,
      endDate: options?.endDate,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Failed to generate recommendations');
  }

  return response.json();
}

// Map AI recommendation categories to TripBit categories
function mapCategoryToTripBitCategory(category: RecommendationCategory): TripBitCategory {
  switch (category) {
    case 'restaurant':
      return 'restaurant';
    case 'activity':
      return 'activity';
    case 'stay':
      return 'hotel';
    case 'tip':
      return 'note';
    default:
      return 'other';
  }
}

export async function saveRecommendationAsTripBit(
  tripId: string,
  userId: string,
  recommendation: AIRecommendation
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Build notes from recommendation details
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

    const { error: insertError } = await supabase.from('trip_bits').insert({
      trip_id: tripId,
      created_by: userId,
      category: mapCategoryToTripBitCategory(recommendation.category),
      title: recommendation.title,
      notes: notesParts.join('\n\n'),
      is_booked: false,
    });

    if (insertError) {
      console.error('Error saving recommendation:', insertError);
      return { success: false, error: 'Failed to save recommendation' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving recommendation:', err);
    return { success: false, error: 'Failed to save recommendation' };
  }
}

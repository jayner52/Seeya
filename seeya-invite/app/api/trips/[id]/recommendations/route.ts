import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AIRecommendation, RecommendationCategory } from '@/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GOOGLE_PLACES_TEXTSEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

async function enrichWithGooglePlaces(
  recommendations: AIRecommendation[],
  destination: string,
  category: string
): Promise<AIRecommendation[]> {
  if (category === 'tip') return recommendations;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return recommendations;

  const results = await Promise.allSettled(
    recommendations.map(async (rec) => {
      const query = `${rec.title} ${destination}`;
      const url = new URL(GOOGLE_PLACES_TEXTSEARCH_URL);
      url.searchParams.set('query', query);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.length) {
        return rec;
      }

      const place = data.results[0];
      const photoRef = place.photos?.[0]?.photo_reference;

      return {
        ...rec,
        googlePlaceId: place.place_id,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        priceLevel: place.price_level,
        address: place.formatted_address,
        photoUrl: photoRef
          ? `/api/places/photo?ref=${encodeURIComponent(photoRef)}&maxwidth=400`
          : undefined,
        googleMapsUrl: place.place_id
          ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
          : undefined,
      };
    })
  );

  return results.map((result, i) =>
    result.status === 'fulfilled' ? result.value : recommendations[i]
  );
}

// Filter types for each category
export interface RestaurantFilters {
  cuisine?: string;
  neighborhood?: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late-night';
  vibe?: 'romantic' | 'casual' | 'family' | 'trendy' | 'traditional';
}

export interface ActivityFilters {
  type?: 'outdoor' | 'cultural' | 'nightlife' | 'tours' | 'shopping' | 'wellness';
  duration?: 'quick' | 'half-day' | 'full-day';
  difficulty?: 'easy' | 'moderate' | 'challenging';
  kidFriendly?: boolean;
}

export interface StayFilters {
  neighborhood?: string;
  propertyType?: 'hotel' | 'boutique' | 'airbnb' | 'hostel' | 'resort';
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  amenities?: string[];
}

export interface TipFilters {
  topic?: 'transport' | 'safety' | 'culture' | 'money' | 'packing' | 'local-customs' | 'food' | 'language';
}

export type CategoryFilters = RestaurantFilters | ActivityFilters | StayFilters | TipFilters;

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function buildCategoryPrompt(
  category: RecommendationCategory,
  destination: string,
  count: number,
  filters?: CategoryFilters,
  startDate?: string,
  endDate?: string
): string {
  let dateContext = '';
  if (startDate && endDate) {
    dateContext = ` The trip is from ${startDate} to ${endDate}.`;
  } else if (startDate) {
    dateContext = ` The trip starts on ${startDate}.`;
  }

  // Build filter context based on category
  let filterContext = '';
  if (filters && Object.keys(filters).length > 0) {
    const filterParts: string[] = [];

    if (category === 'restaurant') {
      const f = filters as RestaurantFilters;
      if (f.cuisine) filterParts.push(`cuisine: ${f.cuisine}`);
      if (f.neighborhood) filterParts.push(`in ${f.neighborhood} area`);
      if (f.priceRange) filterParts.push(`price range: ${f.priceRange}`);
      if (f.mealType) filterParts.push(`for ${f.mealType}`);
      if (f.vibe) filterParts.push(`${f.vibe} atmosphere`);
    } else if (category === 'activity') {
      const f = filters as ActivityFilters;
      if (f.type) filterParts.push(`type: ${f.type}`);
      if (f.duration) filterParts.push(`duration: ${f.duration}`);
      if (f.difficulty) filterParts.push(`difficulty: ${f.difficulty}`);
      if (f.kidFriendly) filterParts.push('kid-friendly');
    } else if (category === 'stay') {
      const f = filters as StayFilters;
      if (f.neighborhood) filterParts.push(`in ${f.neighborhood} area`);
      if (f.propertyType) filterParts.push(`type: ${f.propertyType}`);
      if (f.priceRange) filterParts.push(`price range: ${f.priceRange}`);
      if (f.amenities?.length) filterParts.push(`with: ${f.amenities.join(', ')}`);
    } else if (category === 'tip') {
      const f = filters as TipFilters;
      if (f.topic) filterParts.push(`about: ${f.topic}`);
    }

    if (filterParts.length > 0) {
      filterContext = `\n\nUser preferences: ${filterParts.join(', ')}.`;
    }
  }

  // Category-specific prompts
  const categoryPrompts: Record<RecommendationCategory, string> = {
    restaurant: `You are a local food expert helping plan dining experiences in ${destination}.${dateContext}${filterContext}

Generate ${count} authentic restaurant recommendations. Focus on places locals love, not tourist traps. Include hidden gems and neighborhood favorites.

Return a JSON array (no markdown, just raw JSON):
[
  {
    "title": "Restaurant name",
    "description": "Brief description of cuisine, specialty dishes, and atmosphere (2-3 sentences)",
    "category": "restaurant",
    "tips": "Insider tip (best dish to order, reservation advice, best seats, etc.)",
    "estimatedCost": "$XX-XX per person",
    "bestTimeToVisit": "Best time/day to visit"
  }
]

Be specific with real places. Include a mix of price points unless filtered.`,

    activity: `You are a local guide helping plan activities in ${destination}.${dateContext}${filterContext}

Generate ${count} unique activity recommendations. Focus on authentic experiences that go beyond typical tourist activities. Include local favorites and hidden gems.

Return a JSON array (no markdown, just raw JSON):
[
  {
    "title": "Activity name",
    "description": "What you'll do and why it's special (2-3 sentences)",
    "category": "activity",
    "tips": "Insider tip (best time, what to bring, how to avoid crowds, etc.)",
    "estimatedCost": "$XX-XX or Free",
    "bestTimeToVisit": "Best time/season"
  }
]

Be specific with real activities and locations.`,

    stay: `You are a local accommodation expert helping find places to stay in ${destination}.${dateContext}${filterContext}

Generate ${count} accommodation recommendations. Focus on well-located options with good value and local character. Include different neighborhood options.

Return a JSON array (no markdown, just raw JSON):
[
  {
    "title": "Property or Hotel name",
    "description": "What makes this place special, location benefits (2-3 sentences)",
    "category": "stay",
    "tips": "Insider tip (best room type, booking advice, nearby highlights)",
    "estimatedCost": "$XX-XX per night",
    "bestTimeToVisit": "Best time to book or visit"
  }
]

Be specific with real properties. Include neighborhood context.`,

    tip: `You are a seasoned traveler sharing essential tips for visiting ${destination}.${dateContext}${filterContext}

Generate ${count} practical travel tips. Focus on advice that saves time, money, or enhances the experience. Share local knowledge that isn't in guidebooks.

Return a JSON array (no markdown, just raw JSON):
[
  {
    "title": "Tip title (short and actionable)",
    "description": "Detailed explanation of the tip (2-3 sentences)",
    "category": "tip",
    "tips": "Additional context or related advice"
  }
]

Be specific and actionable. Avoid generic advice.`,
  };

  return categoryPrompts[category];
}

function parseRecommendations(content: string): AIRecommendation[] {
  // Try to extract JSON from the response
  let jsonStr = content;

  // Handle markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const parsed = JSON.parse(jsonStr.trim());

  // Handle both array and object responses
  const items = Array.isArray(parsed) ? parsed : (parsed.recommendations || []);

  // Add IDs to each recommendation
  return items.map((item: Omit<AIRecommendation, 'id'>) => ({
    ...item,
    id: generateId(),
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      destination,
      category,
      count = 4,
      filters,
      startDate,
      endDate
    } = body;

    // Validate required fields
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    if (!category || !['restaurant', 'activity', 'stay', 'tip'].includes(category)) {
      return NextResponse.json(
        { error: 'Valid category is required (restaurant, activity, stay, tip)' },
        { status: 400 }
      );
    }

    // Validate count
    const recommendationCount = Math.min(Math.max(1, count), 10); // 1-10 items

    // Verify user has access to this trip
    const { data: participant } = await supabase
      .from('trip_participants')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    const { data: trip } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    const isOwner = trip?.user_id === user.id;
    const isParticipant = !!participant;

    if (!isOwner && !isParticipant) {
      return NextResponse.json(
        { error: 'Access denied to this trip' },
        { status: 403 }
      );
    }

    // Check for OpenRouter API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI recommendations are not configured' },
        { status: 503 }
      );
    }

    // Build category-specific prompt
    const prompt = buildCategoryPrompt(
      category as RecommendationCategory,
      destination,
      recommendationCount,
      filters,
      startDate,
      endDate
    );

    // Call OpenRouter API with reduced tokens for single category
    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://seeya.app',
        'X-Title': 'Seeya Travel App',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 800, // Reduced from 2000 - only generating one category
        temperature: 0.7,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.text();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate recommendations' },
        { status: 502 }
      );
    }

    const aiResponse = await openRouterResponse.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No recommendations generated' },
        { status: 502 }
      );
    }

    // Parse the AI response
    const recommendations = parseRecommendations(content);

    // Enrich with Google Places data (rating, photo, address)
    const enrichedRecommendations = await enrichWithGooglePlaces(
      recommendations,
      destination,
      category
    );

    // Return with category info
    return NextResponse.json({
      category,
      destination,
      filters: filters || {},
      recommendations: enrichedRecommendations,
    });

  } catch (error) {
    console.error('Recommendations API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

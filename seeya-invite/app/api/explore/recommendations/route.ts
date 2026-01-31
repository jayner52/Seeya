import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AIRecommendation, RecommendationCategory } from '@/types';
import type {
  RestaurantFilters,
  ActivityFilters,
  StayFilters,
  TipFilters,
  CategoryFilters,
} from '@/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function buildCategoryPrompt(
  category: RecommendationCategory,
  destination: string,
  count: number,
  filters?: CategoryFilters
): string {
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
    restaurant: `You are a local food expert helping plan dining experiences in ${destination}.${filterContext}

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

    activity: `You are a local guide helping plan activities in ${destination}.${filterContext}

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

    stay: `You are a local accommodation expert helping find places to stay in ${destination}.${filterContext}

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

    tip: `You are a seasoned traveler sharing essential tips for visiting ${destination}.${filterContext}

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
  let jsonStr = content;

  // Handle markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const parsed = JSON.parse(jsonStr.trim());
  const items = Array.isArray(parsed) ? parsed : (parsed.recommendations || []);

  return items.map((item: Omit<AIRecommendation, 'id'>) => ({
    ...item,
    id: generateId(),
  }));
}

export async function POST(request: Request) {
  try {
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
    const recommendationCount = Math.min(Math.max(1, count), 10);

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
      filters
    );

    // Call OpenRouter API
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
        max_tokens: 800,
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

    return NextResponse.json({
      category,
      destination,
      filters: filters || {},
      recommendations,
    });

  } catch (error) {
    console.error('Explore recommendations API error:', error);

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

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AIRecommendationsResponse, AIRecommendation } from '@/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function buildPrompt(destination: string, startDate?: string, endDate?: string): string {
  let dateContext = '';
  if (startDate && endDate) {
    dateContext = ` The trip is from ${startDate} to ${endDate}.`;
  } else if (startDate) {
    dateContext = ` The trip starts on ${startDate}.`;
  }

  return `You are a travel expert helping plan a trip to ${destination}.${dateContext}

Generate authentic, local-favorite recommendations that go beyond typical tourist spots. Focus on experiences that locals love and hidden gems.

Return a JSON object with exactly this structure (no markdown, just raw JSON):
{
  "restaurants": [
    {
      "title": "Name of place",
      "description": "Brief description (1-2 sentences)",
      "category": "restaurant",
      "tips": "Insider tip for visitors",
      "estimatedCost": "$XX-XX per person",
      "bestTimeToVisit": "When to go"
    }
  ],
  "activities": [
    {
      "title": "Activity name",
      "description": "Brief description",
      "category": "activity",
      "tips": "Insider tip",
      "estimatedCost": "$XX-XX",
      "bestTimeToVisit": "Best time"
    }
  ],
  "stays": [
    {
      "title": "Accommodation name",
      "description": "Brief description",
      "category": "stay",
      "tips": "Insider tip",
      "estimatedCost": "$XX-XX per night",
      "bestTimeToVisit": "Best booking time"
    }
  ],
  "tips": [
    {
      "title": "Tip title",
      "description": "Helpful travel tip for this destination",
      "category": "tip",
      "tips": "Additional context"
    }
  ]
}

Provide 3-4 items per category. Make recommendations specific, actionable, and authentic to ${destination}.`;
}

function parseRecommendations(content: string): AIRecommendationsResponse {
  // Try to extract JSON from the response
  let jsonStr = content;

  // Handle markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const parsed = JSON.parse(jsonStr.trim());

  // Add IDs to each recommendation
  const addIds = (items: Omit<AIRecommendation, 'id'>[]): AIRecommendation[] => {
    return (items || []).map(item => ({
      ...item,
      id: generateId(),
    }));
  };

  return {
    restaurants: addIds(parsed.restaurants || []),
    activities: addIds(parsed.activities || []),
    stays: addIds(parsed.stays || []),
    tips: addIds(parsed.tips || []),
  };
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
    const { destination, startDate, endDate } = body;

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

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

    // Call OpenRouter API
    const prompt = buildPrompt(destination, startDate, endDate);

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
        max_tokens: 2000,
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

    return NextResponse.json(recommendations);

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

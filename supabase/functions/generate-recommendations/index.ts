import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecommendationSuggestion {
  name: string;
  description: string;
  category: 'restaurant' | 'activity' | 'stay' | 'tip';
  rating?: string;
  priceRange?: string;
  url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { destination, category } = await req.json();
    
    if (!destination) {
      return new Response(
        JSON.stringify({ error: 'Destination is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const categoryText = category && category !== 'all' 
      ? `${category}s` 
      : 'restaurants, activities, places to stay, and travel tips';

    const systemPrompt = `You are a travel expert providing recommendations. Always respond with valid JSON array only, no markdown or extra text.`;
    
    const userPrompt = `Give me exactly 5 top-rated ${categoryText} recommendations for ${destination}.

For each recommendation, provide:
- name: The exact name of the place/activity
- description: A brief 1-2 sentence description of why it's recommended
- category: One of "restaurant", "activity", "stay", or "tip"
- rating: A rating like "4.8" or "Highly Rated" (optional)
- priceRange: Price indicator like "$", "$$", "$$$", or "$$$$" for restaurants/stays (optional)

Respond ONLY with a JSON array of objects. Example format:
[{"name":"Example Place","description":"Great for...","category":"restaurant","rating":"4.8","priceRange":"$$"}]`;

    console.log(`Generating recommendations for ${destination}, category: ${category || 'all'}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response:', content);

    // Parse the JSON response - handle potential markdown wrapping
    let recommendations: RecommendationSuggestion[];
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      recommendations = JSON.parse(cleanContent);
      
      // Validate the structure
      if (!Array.isArray(recommendations)) {
        throw new Error('Response is not an array');
      }
      
      // Ensure each item has required fields and generate Google Maps URL
      recommendations = recommendations.map(rec => {
        const placeName = rec.name || 'Unknown';
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${placeName}, ${destination}`)}`;
        return {
          name: placeName,
          description: rec.description || '',
          category: ['restaurant', 'activity', 'stay', 'tip'].includes(rec.category) ? rec.category : 'tip',
          rating: rec.rating,
          priceRange: rec.priceRange,
          url: mapsUrl,
        };
      });
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Content was:', content);
      throw new Error('Failed to parse recommendations from AI');
    }

    console.log(`Successfully generated ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
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

    const body = await req.json();
    
    // Support both old and new API formats
    const locations: string[] = body.locations || (body.city ? [`${body.city}, ${body.country}`] : []);
    const tripTypes: string[] = body.tripTypes || (body.tripType ? [body.tripType] : []);

    if (locations.length === 0 || tripTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: locations and tripTypes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating names for:', { locations, tripTypes });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build a dynamic prompt based on number of locations and vibes
    const locationText = locations.length === 1
      ? locations[0]
      : locations.join(', ');
    
    const vibeText = tripTypes.length === 1
      ? tripTypes[0]
      : tripTypes.join(' + ');

    const isMultiDestination = locations.length > 1;
    const isMultiVibe = tripTypes.length > 1;

    const prompt = `Generate 3 creative, fun, and memorable trip names for a trip.

Destinations: ${locationText}
Vibes: ${vibeText}

Rules:
- Each name should be catchy and unique
- Can include emojis but keep them tasteful (max 1-2 per name)
- Keep names short (2-5 words)
- Make them fun and shareable
${isMultiDestination ? '- Capture the multi-destination nature creatively (e.g., "Euro Hop", "Grand Tour", route themes)' : ''}
${isMultiVibe ? '- Blend the vibes together creatively' : `- Reflect the ${tripTypes[0]} vibe`}

Return ONLY a JSON array of 3 strings, nothing else. Example format:
["Name One 🌴", "Name Two", "Name Three ✨"]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a creative travel naming assistant. You respond only with JSON arrays.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse the JSON array from the response
    let suggestions: string[] = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse suggestions:', e);
      // Fallback suggestions based on first location and vibe
      const firstLocation = locations[0].split(',')[0].trim();
      const firstVibe = tripTypes[0];
      suggestions = [
        `${firstLocation} Adventure`,
        `${firstVibe} in ${firstLocation}`,
        `${firstLocation} ${new Date().getFullYear()}`,
      ];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-trip-name:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

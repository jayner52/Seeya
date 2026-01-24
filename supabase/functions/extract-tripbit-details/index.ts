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
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Extracting tripbit details from image for user:', user.id);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting travel booking details from images. Extract all relevant information and return it as structured JSON.

Return a JSON object with these fields (use null for any field you cannot determine):
{
  "category": "flight" | "accommodation" | "rental_car" | "reservation" | "activity" | "transportation" | "document" | "other",
  "title": "string - a concise descriptive title for this booking",
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "description": "string - any additional notes or important details",
  "metadata": {
    // For flights:
    "airline": "string",
    "flightNumber": "string",
    "departureAirport": "string (3-letter code)",
    "arrivalAirport": "string (3-letter code)",
    "departureTime": "HH:MM (24hr)",
    "arrivalTime": "HH:MM (24hr)",
    "confirmationNumber": "string",
    
    // For accommodation:
    "checkInTime": "HH:MM",
    "checkOutTime": "HH:MM",
    "confirmationNumber": "string",
    "address": "string",
    
    // For rental car:
    "company": "string",
    "pickupLocation": "string",
    "dropoffLocation": "string",
    "pickupTime": "HH:MM",
    "dropoffTime": "HH:MM",
    "confirmationNumber": "string",
    
    // For reservation (restaurant, etc):
    "venue": "string",
    "time": "HH:MM",
    "partySize": number,
    "confirmationNumber": "string",
    "address": "string",
    
    // For activity:
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "confirmationNumber": "string",
    "address": "string",
    "meetingPoint": "string"
  }
}

Only include metadata fields relevant to the detected category. Be thorough but accurate - don't guess if information isn't visible.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all travel booking details from this image. Return only valid JSON, no markdown or explanation.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    // Parse JSON from the response (handle potential markdown wrapping)
    let extracted;
    try {
      // Try to extract JSON from markdown code block if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      extracted = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('Failed to parse extracted details');
    }

    console.log('Extracted details:', extracted);

    return new Response(
      JSON.stringify({ extracted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-tripbit-details:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

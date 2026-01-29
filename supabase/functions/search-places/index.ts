import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { query, type = 'city', countryCode, placeId } = await req.json();
    
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle place details request
    if (placeId) {
      console.log(`Fetching place details for: ${placeId}`);
      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      detailsUrl.searchParams.set('place_id', placeId);
      detailsUrl.searchParams.set('fields', 'address_components,formatted_address,name,place_id,types');
      detailsUrl.searchParams.set('key', apiKey);

      const detailsResponse = await fetch(detailsUrl.toString());
      const detailsData = await detailsResponse.json();

      if (detailsData.status !== 'OK') {
        console.error('Place Details API error:', detailsData.status, detailsData.error_message);
        return new Response(
          JSON.stringify({ error: detailsData.error_message || 'Place Details API error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract country code, city name and emoji from address components
      const result = detailsData.result;
      let countryCode = '';
      let countryName = '';
      let cityName = '';
      
      for (const component of result.address_components || []) {
        if (component.types.includes('locality')) {
          cityName = component.long_name;
        } else if (!cityName && component.types.includes('administrative_area_level_1')) {
          // Fallback to region/province if no locality found
          cityName = component.long_name;
        }
        if (component.types.includes('country')) {
          countryCode = component.short_name;
          countryName = component.long_name;
        }
      }

      // Convert country code to flag emoji
      const countryEmoji = countryCode 
        ? String.fromCodePoint(...[...countryCode.toUpperCase()].map(c => 127397 + c.charCodeAt(0)))
        : '';

      console.log(`Place details extracted - city: ${cityName}, country: ${countryName} (${countryCode})`);

      return new Response(
        JSON.stringify({
          placeDetails: {
            place_id: result.place_id,
            name: result.name,
            formatted_address: result.formatted_address,
            country_code: countryCode,
            country_name: countryName,
            country_emoji: countryEmoji,
            city_name: cityName,
            types: result.types,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle autocomplete search
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching Google Places for: ${query}, type: ${type}, countryCode: ${countryCode || 'none'}`);

    // Use Places Autocomplete API
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', query);
    url.searchParams.set('key', apiKey);

    if (type === 'country') {
      // Search for countries only
      url.searchParams.set('types', 'country');
    } else if (type === 'establishment') {
      // Search for businesses/establishments (restaurants, hotels, etc.)
      url.searchParams.set('types', 'establishment');
      if (countryCode) {
        url.searchParams.set('components', `country:${countryCode}`);
      }
    } else {
      // Search for cities
      url.searchParams.set('types', '(cities)');
      // Optionally restrict to a specific country
      if (countryCode) {
        url.searchParams.set('components', `country:${countryCode}`);
      }
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: data.error_message || 'Places API error', status: data.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${data.predictions?.length || 0} predictions`);

    // Transform predictions to a cleaner format
    const predictions = (data.predictions || []).map((p: any) => {
      return {
        place_id: p.place_id,
        description: p.description,
        main_text: p.structured_formatting?.main_text || p.description,
        secondary_text: p.structured_formatting?.secondary_text || '',
        types: p.types || [],
      };
    });

    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in search-places function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

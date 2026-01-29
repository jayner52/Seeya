import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('Missing token parameter', { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    console.log('Fetching invite preview for token:', token);

    // Create Supabase client with service role for public access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get trip invite preview data using existing database function
    const { data: preview, error } = await supabase
      .rpc('get_trip_invite_preview', { _token: token });

    if (error) {
      console.error('Error fetching invite preview:', error);
      return generateFallbackHtml();
    }

    if (!preview) {
      console.log('No preview data found for token');
      return generateFallbackHtml();
    }

    console.log('Preview data:', JSON.stringify(preview));

    const trip = preview.trip;
    const owner = preview.owner;
    const locations = preview.locations || [];

    // Build title and description
    const tripName = trip.name || 'Trip Invitation';
    const destination = trip.destination || (locations.length > 0 ? locations[0].destination : 'Adventure');
    
    // Format dates
    let dateText = '';
    if (trip.is_flexible_dates && trip.flexible_month) {
      dateText = trip.flexible_month;
    } else if (trip.start_date && trip.end_date) {
      const startDate = new Date(trip.start_date);
      const endDate = new Date(trip.end_date);
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      const yearOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      
      if (startDate.getFullYear() === endDate.getFullYear()) {
        dateText = `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', yearOptions)}`;
      } else {
        dateText = `${startDate.toLocaleDateString('en-US', yearOptions)} - ${endDate.toLocaleDateString('en-US', yearOptions)}`;
      }
    } else if (trip.start_date) {
      dateText = new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const ownerName = owner?.full_name || owner?.username || 'A friend';
    const title = `${ownerName} invited you to ${tripName}`;
    const description = dateText 
      ? `Join this trip to ${destination} • ${dateText}`
      : `Join this trip to ${destination}`;

    // Base URL for the app
    const appUrl = 'https://gftycnjxbfxfrwwkexlm.lovableproject.com';
    const inviteUrl = `${appUrl}/accept-invite?token=${token}`;
    const ogImageUrl = `${appUrl}/og-image.png`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | roamwyth</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(inviteUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:site_name" content="roamwyth">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(inviteUrl)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${ogImageUrl}">
  
  <!-- Redirect to actual invite page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(inviteUrl)}">
  <script>window.location.href = "${escapeHtml(inviteUrl)}";</script>
</head>
<body>
  <p>Redirecting to your trip invite...</p>
  <p><a href="${escapeHtml(inviteUrl)}">Click here if you are not redirected</a></p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error generating OG tags:', error);
    return generateFallbackHtml();
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateFallbackHtml(): Response {
  const appUrl = 'https://gftycnjxbfxfrwwkexlm.lovableproject.com';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Invitation | roamwyth</title>
  
  <meta property="og:type" content="website">
  <meta property="og:title" content="You're invited to a trip!">
  <meta property="og:description" content="Join your friends on roamwyth - where travel is better together">
  <meta property="og:image" content="${appUrl}/og-image.png">
  <meta property="og:site_name" content="roamwyth">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="You're invited to a trip!">
  <meta name="twitter:description" content="Join your friends on roamwyth - where travel is better together">
  <meta name="twitter:image" content="${appUrl}/og-image.png">
  
  <meta http-equiv="refresh" content="0;url=${appUrl}">
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

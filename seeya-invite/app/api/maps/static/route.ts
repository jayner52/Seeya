import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return new Response('No API key', { status: 500 });

  const locs = request.nextUrl.searchParams.getAll('loc');
  if (locs.length === 0) return new Response('No locations', { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seeya-tawny.vercel.app';

  // Build URL — do NOT encodeURIComponent the whole marker string;
  // Google parses pipe-delimited values after standard query decoding
  let url = `https://maps.googleapis.com/maps/api/staticmap?size=320x320&scale=2&maptype=roadmap&key=${apiKey}`;

  locs.forEach((p, i) => {
    url += `&markers=color:0xa855f7|label:${i + 1}|${encodeURIComponent(p)}`;
  });

  if (locs.length >= 2) {
    const pathCoords = locs.map(p => encodeURIComponent(p)).join('|');
    url += `&path=color:0xa855f7cc|weight:3|${pathCoords}`;
  }

  const res = await fetch(url, {
    headers: { Referer: siteUrl },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[maps/static] Google error', res.status, body);
    return new Response('Map fetch failed', { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

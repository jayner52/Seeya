import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return new Response('No API key', { status: 500 });

  const locs = request.nextUrl.searchParams.getAll('loc');
  if (locs.length === 0) return new Response('No locations', { status: 400 });

  let url = `https://maps.googleapis.com/maps/api/staticmap?size=600x180&scale=2&maptype=roadmap&key=${apiKey}`;

  locs.forEach((p, i) => {
    url += `&markers=${encodeURIComponent(`color:0xa855f7|label:${i + 1}|${p}`)}`;
  });

  if (locs.length >= 2) {
    url += `&path=${encodeURIComponent(`color:0xa855f7cc|weight:3|${locs.join('|')}`)}`;
  }

  const res = await fetch(url);
  if (!res.ok) return new Response('Map fetch failed', { status: res.status });

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

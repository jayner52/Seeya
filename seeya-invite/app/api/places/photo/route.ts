import { NextResponse } from 'next/server';

const GOOGLE_PLACES_PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photoReference = searchParams.get('ref');
  const maxWidth = searchParams.get('maxwidth') || '400';

  if (!photoReference) {
    return NextResponse.json(
      { error: 'Photo reference is required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Places API not configured' },
      { status: 503 }
    );
  }

  try {
    const url = new URL(GOOGLE_PLACES_PHOTO_URL);
    url.searchParams.set('photoreference', photoReference);
    url.searchParams.set('maxwidth', maxWidth);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), { redirect: 'follow' });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch photo' },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Places photo proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}

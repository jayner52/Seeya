import { NextResponse } from 'next/server';

const FIND_PLACE_URL = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const maxwidth = searchParams.get('maxwidth') || '800';

  if (!query) {
    return new NextResponse(null, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    const url = new URL(FIND_PLACE_URL);
    url.searchParams.set('input', query);
    url.searchParams.set('inputtype', 'textquery');
    url.searchParams.set('fields', 'photos');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    const photoRef = data.candidates?.[0]?.photos?.[0]?.photo_reference;

    if (!photoRef) {
      return new NextResponse(null, { status: 204 });
    }

    // Redirect to existing photo proxy which handles caching
    const photoUrl = new URL('/api/places/photo', request.url);
    photoUrl.searchParams.set('ref', photoRef);
    photoUrl.searchParams.set('maxwidth', maxwidth);

    return NextResponse.redirect(photoUrl.toString());
  } catch (error) {
    console.error('City photo lookup error:', error);
    return new NextResponse(null, { status: 204 });
  }
}

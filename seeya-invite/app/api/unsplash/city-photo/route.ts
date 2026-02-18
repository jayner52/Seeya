import { NextResponse } from 'next/server';

const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return new NextResponse(null, { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    const url = new URL(UNSPLASH_API_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('per_page', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
      },
    });

    if (!response.ok) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    const photo = data.results?.[0];

    if (!photo) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(
      {
        url: `${photo.urls.raw}&w=800&h=400&fit=crop`,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        unsplashUrl: photo.links.html,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      }
    );
  } catch (error) {
    console.error('Unsplash city photo lookup error:', error);
    return new NextResponse(null, { status: 204 });
  }
}

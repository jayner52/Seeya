import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/ui';
import { ItineraryCopyFlow } from './ItineraryCopyFlow';
import { MapPin, Calendar, User, Eye } from 'lucide-react';

interface ItineraryPageProps {
  params: Promise<{ code: string }>;
}

const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

async function getUnsplashPhoto(query: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }, next: { revalidate: 3600 } }
    );
    const data = await res.json();
    return data?.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

async function getItinerary(code: string) {
  const supabase = await createClient();

  const { data: itinerary, error } = await supabase
    .from('itineraries')
    .select(`
      id, title, description, destination, duration_days, share_code,
      view_count, created_at, created_by,
      itinerary_items (
        id, day_number, order_index, category, title, notes, start_time, location_name
      )
    `)
    .eq('share_code', code)
    .eq('is_published', true)
    .single();

  if (error || !itinerary) return null;

  const { data: creator } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', itinerary.created_by)
    .single();

  // Increment view count
  await supabase
    .from('itineraries')
    .update({ view_count: itinerary.view_count + 1 })
    .eq('id', itinerary.id);

  const sortedItems = [...(itinerary.itinerary_items || [])].sort((a, b) => {
    const dayA = a.day_number ?? 999;
    const dayB = b.day_number ?? 999;
    if (dayA !== dayB) return dayA - dayB;
    return (a.order_index ?? 0) - (b.order_index ?? 0);
  });

  return { ...itinerary, itinerary_items: sortedItems, creator: creator || null };
}

export async function generateMetadata({ params }: ItineraryPageProps): Promise<Metadata> {
  const { code } = await params;
  const itinerary = await getItinerary(code);

  if (!itinerary) return { title: 'Itinerary not found - Seeya' };

  return {
    title: `${itinerary.title} - Seeya Itinerary`,
    description: itinerary.description || `A ${itinerary.destination} itinerary on Seeya`,
    openGraph: {
      title: itinerary.title,
      description: itinerary.description || `${itinerary.destination} travel itinerary`,
      type: 'website',
    },
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  flight: '✈️',
  stay: '🏨',
  car: '🚗',
  activity: '🎯',
  dining: '🍽️',
  transport: '🚌',
  money: '💳',
  reservation: '📅',
  document: '📄',
  photos: '📸',
  other: '📌',
};

export default async function PublicItineraryPage({ params }: ItineraryPageProps) {
  const { code } = await params;
  const itinerary = await getItinerary(code);

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-seeya-secondary via-seeya-secondary/80 to-seeya-primary/30 flex flex-col">
        <header className="p-6">
          <Link href="/">
            <Logo size="md" className="text-seeya-text [&_span]:text-seeya-text" />
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <p className="text-4xl mb-4">🗺️</p>
            <h1 className="text-2xl font-semibold text-seeya-text mb-2">Itinerary not found</h1>
            <p className="text-seeya-text-secondary mb-6">
              This itinerary may have been unpublished or the link is invalid.
            </p>
            <Link href="/" className="text-seeya-purple hover:underline">
              Go to Seeya
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const coverPhoto = await getUnsplashPhoto(itinerary.destination);

  // Group items by day
  const byDay = new Map<number | null, typeof itinerary.itinerary_items>();
  for (const item of itinerary.itinerary_items) {
    const key = item.day_number ?? null;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(item);
  }
  const undated = byDay.get(null) || [];
  const days = Array.from(byDay.entries())
    .filter(([k]) => k !== null)
    .sort(([a], [b]) => (a as number) - (b as number));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <Link
            href="/trips"
            className="text-sm text-seeya-purple hover:underline font-medium"
          >
            My Trips
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {coverPhoto && (
            <div className="h-56 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPhoto}
                alt={itinerary.destination}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-6">
            <h1 className="text-2xl font-display font-bold text-seeya-text mb-2">
              {itinerary.title}
            </h1>
            {itinerary.description && (
              <p className="text-seeya-text-secondary mb-4">{itinerary.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-seeya-text-secondary">
              <div className="flex items-center gap-1.5">
                <MapPin size={15} />
                <span>{itinerary.destination}</span>
              </div>
              {itinerary.duration_days && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={15} />
                  <span>{itinerary.duration_days} days</span>
                </div>
              )}
              {itinerary.creator && (
                <div className="flex items-center gap-1.5">
                  <User size={15} />
                  <span>by {itinerary.creator.full_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Eye size={15} />
                <span>{itinerary.view_count.toLocaleString()} views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copy CTA */}
        <ItineraryCopyFlow shareCode={code} itineraryTitle={itinerary.title} />

        {/* Day-by-day items */}
        {days.length > 0 && (
          <div className="space-y-4">
            {days.map(([dayNum, items]) => (
              <div key={dayNum} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-gradient-to-r from-seeya-purple/10 to-purple-50">
                  <h2 className="font-semibold text-seeya-text">Day {dayNum}</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {(items as typeof itinerary.itinerary_items).map((item) => (
                    <div key={item.id} className="px-6 py-4 flex items-start gap-3">
                      <span className="text-xl mt-0.5">
                        {CATEGORY_ICONS[item.category] || '📌'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-seeya-text">{item.title}</p>
                          {item.start_time && (
                            <span className="text-xs text-seeya-text-secondary whitespace-nowrap">
                              {item.start_time}
                            </span>
                          )}
                        </div>
                        {item.location_name && (
                          <p className="text-sm text-seeya-text-secondary flex items-center gap-1 mt-0.5">
                            <MapPin size={12} />
                            {item.location_name}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-seeya-text-secondary mt-1">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Undated items */}
        {undated.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-gray-50">
              <h2 className="font-semibold text-seeya-text">Other Activities</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {undated.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-start gap-3">
                  <span className="text-xl mt-0.5">
                    {CATEGORY_ICONS[item.category] || '📌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-seeya-text">{item.title}</p>
                    {item.location_name && (
                      <p className="text-sm text-seeya-text-secondary flex items-center gap-1 mt-0.5">
                        <MapPin size={12} />
                        {item.location_name}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-seeya-text-secondary mt-1">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <ItineraryCopyFlow shareCode={code} itineraryTitle={itinerary.title} variant="compact" />
      </main>

      <footer className="p-6 text-center text-seeya-text/60 text-sm">
        &copy; {new Date().getFullYear()} Seeya. All rights reserved.
      </footer>
    </div>
  );
}

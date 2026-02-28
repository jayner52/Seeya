'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, User, ChevronRight, BookOpen } from 'lucide-react';

interface FeaturedItinerary {
  id: string;
  title: string;
  description: string | null;
  destination: string;
  duration_days: number | null;
  share_code: string;
  view_count: number;
  creator: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  coverPhoto?: string | null;
}

const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

async function fetchCoverPhoto(destination: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;
  try {
    const res = await fetch(
      `/api/unsplash/city-photo?city=${encodeURIComponent(destination)}`
    );
    const data = await res.json();
    return data?.photoUrl || null;
  } catch {
    return null;
  }
}

function ItineraryCard({ itinerary }: { itinerary: FeaturedItinerary }) {
  return (
    <Link
      href={`/itinerary/${itinerary.share_code}`}
      className="group shrink-0 w-64 bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Cover */}
      <div className="h-36 bg-gradient-to-br from-seeya-purple/20 to-purple-100 relative overflow-hidden">
        {itinerary.coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={itinerary.coverPhoto}
            alt={itinerary.destination}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-seeya-purple/40" />
          </div>
        )}
        {itinerary.duration_days && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Calendar size={11} />
            {itinerary.duration_days}d
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="font-semibold text-seeya-text text-sm line-clamp-1 group-hover:text-seeya-purple transition-colors">
          {itinerary.title}
        </h4>
        <div className="flex items-center gap-1 text-xs text-seeya-text-secondary mt-1">
          <MapPin size={11} />
          <span className="truncate">{itinerary.destination}</span>
        </div>
        {itinerary.creator && (
          <div className="flex items-center gap-1 text-xs text-seeya-text-secondary mt-1">
            <User size={11} />
            <span className="truncate">{itinerary.creator.full_name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function FeaturedItinerariesSection() {
  const [itineraries, setItineraries] = useState<FeaturedItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch('/api/itineraries/featured');
        const data = await res.json();
        const items: FeaturedItinerary[] = data.itineraries || [];

        // Fetch cover photos in parallel
        const withPhotos = await Promise.all(
          items.map(async (itin) => ({
            ...itin,
            coverPhoto: await fetchCoverPhoto(itin.destination),
          }))
        );

        setItineraries(withPhotos);
      } catch (err) {
        console.error('Error fetching featured itineraries:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  if (isLoading || itineraries.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-seeya-purple" />
          <h3 className="text-lg font-semibold text-seeya-text">Featured Itineraries</h3>
        </div>
        <Link
          href="/explore/itineraries"
          className="flex items-center gap-1 text-sm text-seeya-purple hover:underline"
        >
          View all
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {itineraries.map((itin) => (
          <ItineraryCard key={itin.id} itinerary={itin} />
        ))}
      </div>
    </div>
  );
}

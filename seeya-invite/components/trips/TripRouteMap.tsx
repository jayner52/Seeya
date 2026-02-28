'use client';

import { useState } from 'react';
import { getLocationDisplayName } from '@/types/database';
import type { TripLocation } from '@/types/database';

interface TripRouteMapProps {
  locations: TripLocation[];
}

function buildGoogleMapsUrl(locations: TripLocation[]): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  // Prefer lat/lng coords; fall back to display name (Google geocodes it)
  const points = locations
    .map(l => {
      if (l.city?.latitude != null && l.city?.longitude != null) {
        return `${l.city.latitude},${l.city.longitude}`;
      }
      const name = getLocationDisplayName(l);
      return name !== 'Unknown location' ? name : null;
    })
    .filter(Boolean) as string[];

  if (points.length === 0) return null;

  let url = `https://maps.googleapis.com/maps/api/staticmap?size=600x180&scale=2&maptype=roadmap&key=${apiKey}`;

  points.forEach((p, i) => {
    url += `&markers=${encodeURIComponent(`color:0xa855f7|label:${i + 1}|${p}`)}`;
  });

  if (points.length >= 2) {
    const pathCoords = points.join('|');
    url += `&path=${encodeURIComponent(`color:0xa855f7cc|weight:3|${pathCoords}`)}`;
  }

  return url;
}

export function TripRouteMap({ locations }: TripRouteMapProps) {
  const [imgError, setImgError] = useState(false);
  const url = buildGoogleMapsUrl(locations);

  if (!url) {
    return (
      <div className="w-full h-full bg-purple-900/30 rounded-2xl flex items-center justify-center">
        <span className="text-white/50 text-xs">
          {!process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ? 'map: no api key' : 'map: no locations'}
        </span>
      </div>
    );
  }

  if (imgError) {
    return (
      <div className="w-full h-full bg-purple-900/30 rounded-2xl flex items-center justify-center">
        <span className="text-white/50 text-xs">map: image failed to load</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Trip route map"
      className="w-full h-full object-cover"
      onError={() => setImgError(true)}
    />
  );
}

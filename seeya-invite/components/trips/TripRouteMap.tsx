'use client';

import { useState } from 'react';
import { getLocationDisplayName } from '@/types/database';
import type { TripLocation } from '@/types/database';

interface TripRouteMapProps {
  locations: TripLocation[];
}

function buildSrc(locations: TripLocation[]): string | null {
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
  return `/api/maps/static?${points.map(p => `loc=${encodeURIComponent(p)}`).join('&')}`;
}

function DestinationFallback({ locations }: { locations: TripLocation[] }) {
  const names = locations.map(l => getLocationDisplayName(l).split(',')[0].trim());
  return (
    <div className="w-full h-full flex items-center justify-center px-4">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {names.map((name, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-white/30 text-lg">→</span>}
            <span className="text-white/70 text-sm font-medium tracking-wide">{name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TripRouteMap({ locations }: TripRouteMapProps) {
  const [imgError, setImgError] = useState(false);
  const src = buildSrc(locations);

  if (!src || imgError) {
    return <DestinationFallback locations={locations} />;
  }

  return (
    <img
      src={src}
      alt="Trip route map"
      className="w-full h-full object-cover"
      onError={() => setImgError(true)}
    />
  );
}

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

export function TripRouteMap({ locations }: TripRouteMapProps) {
  const [imgError, setImgError] = useState(false);
  const src = buildSrc(locations);

  if (!src || imgError) return null;

  return (
    <img
      src={src}
      alt="Trip route map"
      className="w-full h-full object-cover"
      onError={() => setImgError(true)}
    />
  );
}

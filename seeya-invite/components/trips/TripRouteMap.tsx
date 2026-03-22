'use client';

import { useState } from 'react';
import { getLocationDisplayName } from '@/types/database';
import type { TripLocation } from '@/types/database';

interface TripRouteMapProps {
  locations: TripLocation[];
}

function getCoordPoints(locations: TripLocation[]): [number, number][] {
  return locations.flatMap(l =>
    l.city?.latitude != null && l.city?.longitude != null
      ? [[l.city.latitude, l.city.longitude] as [number, number]]
      : []
  );
}

function computeBaseZoom(coords: [number, number][]): { centerLat: number; centerLng: number; zoom: number } {
  const lats = coords.map(c => c[0]);
  const lngs = coords.map(c => c[1]);
  const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
  const maxSpan = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs),
  );
  let zoom = 3;
  if (maxSpan < 0.5) zoom = 12;
  else if (maxSpan < 2) zoom = 10;
  else if (maxSpan < 5) zoom = 8;
  else if (maxSpan < 10) zoom = 7;
  else if (maxSpan < 20) zoom = 6;
  else if (maxSpan < 40) zoom = 5;
  else if (maxSpan < 80) zoom = 4;
  return { centerLat, centerLng, zoom };
}

function buildSrc(locations: TripLocation[], zoomDelta: number): string | null {
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

  let url = `/api/maps/static?v=5`;

  // Always compute center/zoom to ensure all stops are visible with padding
  const coords = getCoordPoints(locations);
  if (coords.length >= 1) {
    const { centerLat, centerLng, zoom } = computeBaseZoom(coords);
    // Subtract 1 from base zoom for padding so all markers fit comfortably
    const adjustedZoom = Math.max(2, Math.min(14, zoom - 1 + zoomDelta));
    url += `&center=${centerLat},${centerLng}&zoom=${adjustedZoom}`;
  }

  url += `&${points.map(p => `loc=${encodeURIComponent(p)}`).join('&')}`;
  return url;
}

export function TripRouteMap({ locations }: TripRouteMapProps) {
  const [imgError, setImgError] = useState(false);
  const [zoomDelta, setZoomDelta] = useState(0);

  const hasCoords = getCoordPoints(locations).length >= 1;
  const src = buildSrc(locations, zoomDelta);

  if (!src || imgError) return null;

  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt="Trip route map"
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
      {hasCoords && (
        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          <button
            onClick={() => setZoomDelta(d => Math.min(d + 1, 6))}
            className="w-7 h-7 bg-white/90 hover:bg-white rounded shadow-md text-gray-700 flex items-center justify-center font-bold text-base leading-none"
            title="Zoom in"
          >+</button>
          <button
            onClick={() => setZoomDelta(d => Math.max(d - 1, -4))}
            className="w-7 h-7 bg-white/90 hover:bg-white rounded shadow-md text-gray-700 flex items-center justify-center font-bold text-base leading-none"
            title="Zoom out"
          >−</button>
        </div>
      )}
    </div>
  );
}

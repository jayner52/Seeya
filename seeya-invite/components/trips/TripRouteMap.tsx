import type { TripLocation } from '@/types/database';

interface TripRouteMapProps {
  locations: TripLocation[];
}

function buildGoogleMapsUrl(locations: TripLocation[]): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const points = locations
    .filter(l => l.city?.latitude != null && l.city?.longitude != null)
    .map(l => ({ lat: l.city!.latitude!, lng: l.city!.longitude! }));

  if (points.length === 0) return null;

  let url = `https://maps.googleapis.com/maps/api/staticmap?size=600x180&scale=2&maptype=roadmap&key=${apiKey}`;

  // Numbered purple markers for each stop
  points.forEach((p, i) => {
    url += `&markers=${encodeURIComponent(`color:0xa855f7|label:${i + 1}|${p.lat},${p.lng}`)}`;
  });

  // Route line connecting stops
  if (points.length >= 2) {
    const pathCoords = points.map(p => `${p.lat},${p.lng}`).join('|');
    url += `&path=${encodeURIComponent(`color:0xa855f7cc|weight:3|${pathCoords}`)}`;
  }

  return url;
}

export function TripRouteMap({ locations }: TripRouteMapProps) {
  const url = buildGoogleMapsUrl(locations);
  if (!url) return null;

  return (
    <img
      src={url}
      alt="Trip route map"
      className="w-full h-full object-cover"
    />
  );
}

import { parseISO, isBefore, isAfter } from 'date-fns';
import type { TripLocation } from '@/types/database';

export const CITY_COLORS = [
  { hex: '#8b5cf6', light: '#f5f3ff', name: 'purple' },
  { hex: '#0d9488', light: '#f0fdfa', name: 'teal'   },
  { hex: '#f97316', light: '#fff7ed', name: 'orange' },
  { hex: '#16a34a', light: '#f0fdf4', name: 'green'  },
  { hex: '#2563eb', light: '#eff6ff', name: 'blue'   },
  { hex: '#db2777', light: '#fdf2f8', name: 'pink'   },
];

// Returns all locations whose date range includes dateStr (can be 2 on a travel day)
export function getLocationsForDate(dateStr: string, locations: TripLocation[]): TripLocation[] {
  const date = parseISO(dateStr);
  return locations.filter(loc => {
    if (!loc.arrival_date || !loc.departure_date) return false;
    const arrival = parseISO(loc.arrival_date);
    const departure = parseISO(loc.departure_date);
    return !isBefore(date, arrival) && !isAfter(date, departure);
  });
}

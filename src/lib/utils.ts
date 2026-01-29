import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LocationWithDates {
  id: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
}

export function findMatchingLocations(
  resourceStartDate: Date | undefined,
  resourceEndDate: Date | undefined,
  locations: LocationWithDates[]
): LocationWithDates[] {
  if (!resourceStartDate || locations.length === 0) return [];

  const resStart = resourceStartDate;
  const resEnd = resourceEndDate || resourceStartDate;

  return locations.filter(loc => {
    if (!loc.start_date || !loc.end_date) return false;
    const locStart = new Date(loc.start_date);
    const locEnd = new Date(loc.end_date);
    
    // Check if resource date(s) overlap with location range
    return resStart <= locEnd && resEnd >= locStart;
  });
}

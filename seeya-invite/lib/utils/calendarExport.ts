import type { Trip, TripLocation, TripBit, TripBitCategory } from '@/types';
import { getLocationDisplayName } from '@/types/database';

// Category emoji mappings
const CATEGORY_EMOJI: Record<string, string> = {
  flight: '✈️',
  stay: '🏨',
  car: '🚗',
  activity: '🎯',
  transport: '🚌',
  reservation: '📅',
  document: '📄',
  money: '💰',
  photos: '📸',
  other: '📌',
  // Legacy categories
  hotel: '🏨',
  restaurant: '🍽️',
  note: '📝',
};

function getCategoryEmoji(category: TripBitCategory): string {
  return CATEGORY_EMOJI[category] || '📌';
}

/**
 * Escape special characters for ICS text fields per RFC 5545.
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Format a Date object to an ICS datetime string (YYYYMMDDTHHMMSSZ).
 */
function formatICSDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Format a date string to an ICS all-day date (YYYYMMDD).
 */
function formatICSAllDay(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Generate a unique UID for an ICS event.
 */
function generateUID(id: string): string {
  return `${id}@seeya.app`;
}

/**
 * Build an ICS VEVENT block for a single TripBit.
 */
function buildVEvent(tripBit: TripBit, locationName?: string): string {
  const emoji = getCategoryEmoji(tripBit.category);
  const summary = `${emoji} ${tripBit.title}`;
  const uid = generateUID(tripBit.id);
  const now = formatICSDate(new Date().toISOString());

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escapeICSText(summary)}`,
  ];

  // Date handling
  if (tripBit.start_datetime) {
    const hasTime = tripBit.start_datetime.includes('T') &&
      !tripBit.start_datetime.endsWith('T00:00:00.000Z') &&
      !tripBit.start_datetime.endsWith('T00:00:00Z');

    if (hasTime) {
      lines.push(`DTSTART:${formatICSDate(tripBit.start_datetime)}`);
      if (tripBit.end_datetime) {
        lines.push(`DTEND:${formatICSDate(tripBit.end_datetime)}`);
      } else {
        // Default 1 hour duration if no end time
        const endDate = new Date(new Date(tripBit.start_datetime).getTime() + 60 * 60 * 1000);
        lines.push(`DTEND:${formatICSDate(endDate.toISOString())}`);
      }
    } else {
      // All-day event
      lines.push(`DTSTART;VALUE=DATE:${formatICSAllDay(tripBit.start_datetime)}`);
      if (tripBit.end_datetime) {
        // ICS all-day DTEND is exclusive, so add 1 day
        const endDate = new Date(tripBit.end_datetime);
        endDate.setDate(endDate.getDate() + 1);
        lines.push(`DTEND;VALUE=DATE:${formatICSAllDay(endDate.toISOString())}`);
      } else {
        const nextDay = new Date(tripBit.start_datetime);
        nextDay.setDate(nextDay.getDate() + 1);
        lines.push(`DTEND;VALUE=DATE:${formatICSAllDay(nextDay.toISOString())}`);
      }
    }
  } else if (tripBit.date) {
    // Legacy date field fallback
    lines.push(`DTSTART;VALUE=DATE:${formatICSAllDay(tripBit.date)}`);
    const nextDay = new Date(tripBit.date);
    nextDay.setDate(nextDay.getDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${formatICSAllDay(nextDay.toISOString())}`);
  } else {
    // No date — use created_at as a fallback
    lines.push(`DTSTART:${formatICSDate(tripBit.created_at)}`);
    const endDate = new Date(new Date(tripBit.created_at).getTime() + 60 * 60 * 1000);
    lines.push(`DTEND:${formatICSDate(endDate.toISOString())}`);
  }

  // Location
  if (locationName) {
    lines.push(`LOCATION:${escapeICSText(locationName)}`);
  } else if (tripBit.address) {
    lines.push(`LOCATION:${escapeICSText(tripBit.address)}`);
  }

  // Description with notes + metadata
  const descParts: string[] = [];
  if (tripBit.notes) {
    descParts.push(tripBit.notes);
  }
  if (tripBit.confirmation_number) {
    descParts.push(`Confirmation: ${tripBit.confirmation_number}`);
  }
  if (tripBit.status) {
    descParts.push(`Status: ${tripBit.status}`);
  }
  if (descParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeICSText(descParts.join('\\n'))}`);
  }

  // Category
  lines.push(`CATEGORIES:${tripBit.category}`);

  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

/**
 * Generate a complete ICS calendar string for an entire trip.
 */
export function generateTripICS(
  trip: Trip,
  locations: TripLocation[],
  tripBits: TripBit[]
): string {
  // Build a map of location IDs to display names
  const locationMap = new Map<string, string>();
  for (const loc of locations) {
    locationMap.set(loc.id, getLocationDisplayName(loc));
  }

  const vevents = tripBits.map((bit) => {
    const locName = bit.location_id ? locationMap.get(bit.location_id) : undefined;
    return buildVEvent(bit, locName);
  });

  const calendarName = escapeICSText(`Seeya - ${trip.name}`);

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Seeya//Trip Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    ...vevents,
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}

/**
 * Generate an ICS string for a single TripBit event.
 */
export function generateSingleEventICS(tripBit: TripBit, locationName?: string): string {
  const vevent = buildVEvent(tripBit, locationName);

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Seeya//Trip Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevent,
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}

/**
 * Trigger a file download in the browser.
 */
export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a sanitized filename for a trip ICS export.
 */
export function generateTripFilename(tripName: string, startDate?: string | null): string {
  const sanitized = tripName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (startDate) {
    const d = new Date(startDate);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `seeya-${sanitized}-${dateStr}.ics`;
  }

  return `seeya-${sanitized}.ics`;
}

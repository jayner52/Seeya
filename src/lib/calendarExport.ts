import { format, parseISO } from 'date-fns';
import { Tripbit } from '@/hooks/useTripbits';
import { TripLocation } from '@/hooks/useTripLocations';

interface TripData {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string | null;
}

// Category emoji mappings
const categoryEmojis: Record<string, string> = {
  flight: '✈️',
  accommodation: '🏨',
  rental_car: '🚗',
  transportation: '🚌',
  activity: '🎯',
  restaurant: '🍽️',
  reservation: '📅',
  document: '📄',
  money: '💰',
  communication: '📱',
  other: '📌',
};

// Escape special characters for ICS format
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Format date for ICS (YYYYMMDD for all-day, YYYYMMDDTHHmmssZ for timed)
function formatICSDate(dateStr: string, allDay: boolean = false): string {
  const date = parseISO(dateStr);
  if (allDay) {
    return format(date, "yyyyMMdd");
  }
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

// Generate a unique ID for calendar events
function generateUID(id: string): string {
  return `${id}@tripplanner.app`;
}

// Create a single ICS event
function createICSEvent({
  uid,
  summary,
  description,
  location,
  startDate,
  endDate,
  allDay = false,
}: {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
}): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${generateUID(uid)}`,
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
  ];

  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatICSDate(startDate, true)}`);
    // For all-day events, end date should be the next day
    const endDateObj = parseISO(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${format(endDateObj, 'yyyyMMdd')}`);
  } else {
    lines.push(`DTSTART:${formatICSDate(startDate)}`);
    lines.push(`DTEND:${formatICSDate(endDate)}`);
  }

  lines.push(`SUMMARY:${escapeICS(summary)}`);

  if (description) {
    lines.push(`DESCRIPTION:${escapeICS(description)}`);
  }

  if (location) {
    lines.push(`LOCATION:${escapeICS(location)}`);
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

// Generate ICS file content from trip data
export function generateTripICS(
  trip: TripData,
  locations: TripLocation[],
  tripbits: Tripbit[]
): string {
  const events: string[] = [];

  // Add trip locations as all-day events
  locations.forEach((loc, idx) => {
    if (loc.start_date && loc.end_date) {
      events.push(createICSEvent({
        uid: `loc-${loc.id}`,
        summary: `📍 ${loc.destination}`,
        description: `Leg ${idx + 1} of ${trip.name}`,
        location: loc.destination,
        startDate: loc.start_date,
        endDate: loc.end_date,
        allDay: true,
      }));
    }
  });

  // Add tripbits as events
  tripbits.forEach((tripbit) => {
    const emoji = categoryEmojis[tripbit.category] || '📌';
    const isAllDay = !tripbit.start_date?.includes('T') && !tripbit.end_date?.includes('T');
    
    let description = '';
    if (tripbit.description) {
      description += tripbit.description;
    }
    if (tripbit.url) {
      description += description ? '\n\n' : '';
      description += `URL: ${tripbit.url}`;
    }
    
    // Handle metadata for flights
    const metadata = tripbit.metadata as Record<string, unknown> | null;
    if (tripbit.category === 'flight' && metadata) {
      const parts: string[] = [];
      if (metadata.airline) parts.push(`Airline: ${metadata.airline}`);
      if (metadata.flight_number) parts.push(`Flight: ${metadata.flight_number}`);
      if (metadata.confirmation_number) parts.push(`Confirmation: ${metadata.confirmation_number}`);
      if (metadata.departure_airport && metadata.arrival_airport) {
        parts.push(`Route: ${metadata.departure_airport} → ${metadata.arrival_airport}`);
      }
      if (parts.length > 0) {
        description += description ? '\n\n' : '';
        description += parts.join('\n');
      }
    }

    // Handle metadata for accommodations
    if (tripbit.category === 'accommodation' && metadata) {
      const parts: string[] = [];
      if (metadata.confirmation_number) parts.push(`Confirmation: ${metadata.confirmation_number}`);
      if (metadata.check_in_time) parts.push(`Check-in: ${metadata.check_in_time}`);
      if (metadata.check_out_time) parts.push(`Check-out: ${metadata.check_out_time}`);
      if (metadata.address) parts.push(`Address: ${metadata.address}`);
      if (parts.length > 0) {
        description += description ? '\n\n' : '';
        description += parts.join('\n');
      }
    }

    if (tripbit.start_date) {
      events.push(createICSEvent({
        uid: `tripbit-${tripbit.id}`,
        summary: `${emoji} ${tripbit.title}`,
        description: description || undefined,
        location: getTripbitLocation(tripbit),
        startDate: tripbit.start_date,
        endDate: tripbit.end_date || tripbit.start_date,
        allDay: isAllDay,
      }));
    }
  });

  // Build the complete ICS file
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TripPlanner//Trip Itinerary//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(trip.name)}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

// Get location string for a tripbit
function getTripbitLocation(tripbit: Tripbit): string | undefined {
  const metadata = tripbit.metadata as Record<string, unknown> | null;
  
  if (tripbit.category === 'flight' && metadata) {
    if (metadata.departure_airport && metadata.arrival_airport) {
      return `${metadata.departure_airport} → ${metadata.arrival_airport}`;
    }
  }
  
  if (tripbit.category === 'accommodation' && metadata?.address) {
    return metadata.address as string;
  }
  
  return undefined;
}

// Generate a single event ICS file
export function generateSingleEventICS(tripbit: Tripbit): string {
  const emoji = categoryEmojis[tripbit.category] || '📌';
  const isAllDay = !tripbit.start_date?.includes('T');
  
  let description = tripbit.description || '';
  if (tripbit.url) {
    description += description ? '\n\n' : '';
    description += `URL: ${tripbit.url}`;
  }

  if (!tripbit.start_date) {
    throw new Error('Tripbit must have a start date');
  }

  const event = createICSEvent({
    uid: `tripbit-${tripbit.id}`,
    summary: `${emoji} ${tripbit.title}`,
    description: description || undefined,
    location: getTripbitLocation(tripbit),
    startDate: tripbit.start_date,
    endDate: tripbit.end_date || tripbit.start_date,
    allDay: isAllDay,
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TripPlanner//Trip Itinerary//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    event,
    'END:VCALENDAR',
  ].join('\r\n');
}

// Generate Google Calendar URL for a single event
export function generateGoogleCalendarURL(tripbit: Tripbit): string {
  if (!tripbit.start_date) {
    throw new Error('Tripbit must have a start date');
  }

  const emoji = categoryEmojis[tripbit.category] || '📌';
  const title = `${emoji} ${tripbit.title}`;
  
  const startDate = parseISO(tripbit.start_date);
  const endDate = tripbit.end_date ? parseISO(tripbit.end_date) : startDate;
  
  const isAllDay = !tripbit.start_date.includes('T');
  
  let dateFormat: string;
  if (isAllDay) {
    dateFormat = `${format(startDate, 'yyyyMMdd')}/${format(endDate, 'yyyyMMdd')}`;
  } else {
    dateFormat = `${format(startDate, "yyyyMMdd'T'HHmmss")}/${format(endDate, "yyyyMMdd'T'HHmmss")}`;
  }

  let details = tripbit.description || '';
  if (tripbit.url) {
    details += details ? '\n\n' : '';
    details += `URL: ${tripbit.url}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: dateFormat,
  });

  if (details) {
    params.set('details', details);
  }

  const location = getTripbitLocation(tripbit);
  if (location) {
    params.set('location', location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Download ICS file
export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate filename for trip calendar export
export function generateTripFilename(tripName: string, startDate: string): string {
  const date = parseISO(startDate);
  const formattedDate = format(date, 'MMM_yyyy');
  const safeName = tripName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  return `${safeName}_${formattedDate}.ics`;
}
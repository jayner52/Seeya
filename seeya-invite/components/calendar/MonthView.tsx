'use client';

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
  format,
} from 'date-fns';
import type { CalendarTrip } from '@/types/calendar';
import { LEGEND_COLORS } from '@/types/calendar';
import { DayCell } from './DayCell';
import { cn } from '@/lib/utils/cn';

interface MonthViewProps {
  month: Date;
  trips: CalendarTrip[];
  compact?: boolean;
  extraCompact?: boolean;
  onTripClick?: (trip: CalendarTrip) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthView({
  month,
  trips,
  compact = false,
  extraCompact = false,
  onTripClick,
}: MonthViewProps) {
  // Get all days to display - always 42 days (6 weeks) for uniform height
  const monthStart = startOfMonth(month);
  const calendarStart = startOfWeek(monthStart);

  // Generate exactly 42 days for uniform height
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + i);
    days.push(day);
  }

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const today = new Date();

  // Helper to get trips for a specific day
  const getTripsForDay = (date: Date) => {
    return trips.filter((trip) => {
      const start = parseISO(trip.start_date);
      const end = parseISO(trip.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  // Render compact day cell (just shows dot indicators)
  const renderCompactDay = (day: Date) => {
    const isCurrentMonth = isSameMonth(day, month);
    const isToday = isSameDay(day, today);
    const dayTrips = getTripsForDay(day);
    const hasTrips = dayTrips.length > 0;

    return (
      <button
        key={day.toISOString()}
        onClick={() => hasTrips && dayTrips[0] && onTripClick?.(dayTrips[0])}
        className={cn(
          'aspect-square flex flex-col items-center justify-center relative',
          extraCompact ? 'p-0.5' : 'p-1',
          !isCurrentMonth && 'opacity-40',
          hasTrips && 'cursor-pointer hover:bg-gray-50'
        )}
      >
        <span
          className={cn(
            'flex items-center justify-center rounded-full',
            extraCompact ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs',
            isToday && 'ring-2 ring-seeya-purple',
            isCurrentMonth ? 'text-seeya-text' : 'text-gray-400'
          )}
        >
          {day.getDate()}
        </span>

        {/* Trip indicator dots */}
        {hasTrips && (
          <div className={cn('flex gap-0.5 mt-0.5', extraCompact && 'mt-0')}>
            {dayTrips.slice(0, extraCompact ? 2 : 3).map((trip, i) => (
              <div
                key={trip.id}
                className={cn(
                  'rounded-full',
                  extraCompact ? 'w-1 h-1' : 'w-1.5 h-1.5'
                )}
                style={{ backgroundColor: trip.color }}
              />
            ))}
          </div>
        )}
      </button>
    );
  };

  // Full view uses the DayCell component
  if (!compact) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {/* Month header */}
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
          <h3 className="font-semibold text-seeya-text">
            {format(month, 'MMMM yyyy')}
          </h3>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-seeya-text-secondary uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {weeks.map((week) =>
            week.map((day) => (
              <DayCell
                key={day.toISOString()}
                date={day}
                trips={trips}
                isCurrentMonth={isSameMonth(day, month)}
                onTripClick={onTripClick}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // Compact view - smaller cells with dot indicators
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Month header */}
      <div
        className={cn(
          'bg-gray-50 border-b border-gray-200',
          extraCompact ? 'px-2 py-1' : 'px-3 py-1.5'
        )}
      >
        <h3
          className={cn(
            'font-semibold text-seeya-text',
            extraCompact ? 'text-xs' : 'text-sm'
          )}
        >
          {format(month, extraCompact ? 'MMM yyyy' : 'MMMM yyyy')}
        </h3>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
        {(extraCompact ? WEEKDAYS_SHORT : WEEKDAYS).map((day, i) => (
          <div
            key={`${day}-${i}`}
            className={cn(
              'text-center font-medium text-seeya-text-secondary',
              extraCompact ? 'py-1 text-[9px]' : 'py-1 text-[10px]'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid - compact */}
      <div
        className={cn(
          'grid grid-cols-7',
          extraCompact ? 'gap-0' : 'gap-0.5 p-1'
        )}
      >
        {weeks.map((week) => week.map((day) => renderCompactDay(day)))}
      </div>
    </div>
  );
}

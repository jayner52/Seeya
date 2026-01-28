'use client';

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  format,
} from 'date-fns';
import type { CalendarTrip } from '@/types/calendar';
import { DayCell } from './DayCell';

interface MonthViewProps {
  month: Date;
  trips: CalendarTrip[];
  compact?: boolean;
  onTripClick?: (trip: CalendarTrip) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ month, trips, compact = false, onTripClick }: MonthViewProps) {
  // Get all days to display (including padding days from prev/next month)
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
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
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => (
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

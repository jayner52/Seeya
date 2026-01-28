'use client';

import { isSameDay, isWithinInterval, parseISO, isSameMonth } from 'date-fns';
import type { CalendarTrip } from '@/types/calendar';
import { LEGEND_COLORS } from '@/types/calendar';
import { cn } from '@/lib/utils/cn';

interface DayCellProps {
  date: Date;
  trips: CalendarTrip[];
  isCurrentMonth: boolean;
  onTripClick?: (trip: CalendarTrip) => void;
}

export function DayCell({ date, trips, isCurrentMonth, onTripClick }: DayCellProps) {
  const today = new Date();
  const isToday = isSameDay(date, today);

  // Get trips that span this day
  const dayTrips = trips.filter((trip) => {
    const start = parseISO(trip.start_date);
    const end = parseISO(trip.end_date);
    return isWithinInterval(date, { start, end });
  });

  // Determine trip bar position for each trip
  const getTripPosition = (trip: CalendarTrip): 'start' | 'middle' | 'end' | 'single' => {
    const start = parseISO(trip.start_date);
    const end = parseISO(trip.end_date);
    const isStart = isSameDay(date, start);
    const isEnd = isSameDay(date, end);

    if (isStart && isEnd) return 'single';
    if (isStart) return 'start';
    if (isEnd) return 'end';
    return 'middle';
  };

  return (
    <div
      className={cn(
        'min-h-[80px] border-b border-r border-gray-100 p-1',
        !isCurrentMonth && 'bg-gray-50'
      )}
    >
      {/* Day number */}
      <div className="flex justify-end mb-1">
        <span
          className={cn(
            'w-6 h-6 flex items-center justify-center text-sm',
            isToday && 'rounded-full border-2',
            isToday && `border-[${LEGEND_COLORS.today}]`,
            isCurrentMonth ? 'text-seeya-text' : 'text-gray-400'
          )}
          style={isToday ? { borderColor: LEGEND_COLORS.today, color: LEGEND_COLORS.today } : undefined}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Trip bars */}
      <div className="space-y-0.5">
        {dayTrips.slice(0, 3).map((trip) => {
          const position = getTripPosition(trip);
          return (
            <button
              key={trip.id}
              onClick={() => onTripClick?.(trip)}
              className={cn(
                'block h-5 w-full text-xs font-medium truncate text-left px-1',
                'hover:brightness-95 transition-all cursor-pointer',
                position === 'start' || position === 'single' ? 'rounded-l-md' : '',
                position === 'end' || position === 'single' ? 'rounded-r-md' : ''
              )}
              style={{ backgroundColor: trip.color }}
              title={trip.name}
            >
              {(position === 'start' || position === 'single') && (
                <span className="text-gray-800 truncate block">{trip.name}</span>
              )}
            </button>
          );
        })}
        {dayTrips.length > 3 && (
          <div className="text-xs text-seeya-text-secondary px-1">
            +{dayTrips.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

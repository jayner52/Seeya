'use client';

import type { CalendarTrip } from '@/types/calendar';
import { cn } from '@/lib/utils/cn';

interface TripBarProps {
  trip: CalendarTrip;
  position: 'start' | 'middle' | 'end' | 'single';
  onClick?: () => void;
}

export function TripBar({ trip, position, onClick }: TripBarProps) {
  // Determine bar shape based on position
  const isStart = position === 'start' || position === 'single';
  const isEnd = position === 'end' || position === 'single';

  return (
    <button
      onClick={onClick}
      className={cn(
        'h-5 w-full text-xs font-medium truncate text-left px-1',
        'hover:brightness-95 transition-all cursor-pointer',
        isStart && 'rounded-l-md',
        isEnd && 'rounded-r-md',
        !isStart && !isEnd && 'rounded-none'
      )}
      style={{ backgroundColor: trip.color }}
      title={trip.name}
    >
      {isStart && (
        <span className="text-gray-800 truncate">
          {trip.name}
        </span>
      )}
    </button>
  );
}

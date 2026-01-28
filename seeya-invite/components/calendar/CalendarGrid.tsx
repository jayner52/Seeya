'use client';

import { addMonths } from 'date-fns';
import { useCalendarStore } from '@/stores/calendarStore';
import type { CalendarTrip } from '@/types/calendar';
import { MonthView } from './MonthView';
import { cn } from '@/lib/utils/cn';

interface CalendarGridProps {
  trips: CalendarTrip[];
  onTripClick?: (trip: CalendarTrip) => void;
}

export function CalendarGrid({ trips, onTripClick }: CalendarGridProps) {
  const { viewMode, currentDate } = useCalendarStore();

  // Generate months to display
  const monthCount = viewMode === '1mo' ? 1 : viewMode === '3mo' ? 3 : viewMode === '6mo' ? 6 : 12;
  const months: Date[] = [];

  for (let i = 0; i < monthCount; i++) {
    months.push(addMonths(currentDate, i));
  }

  // Grid columns based on view mode
  const gridCols = viewMode === '1mo' ? 'grid-cols-1' :
                   viewMode === '3mo' ? 'grid-cols-1 lg:grid-cols-3' :
                   viewMode === '6mo' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                   'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className={cn('grid gap-4', gridCols)}>
      {months.map((month) => (
        <MonthView
          key={month.toISOString()}
          month={month}
          trips={trips}
          compact={monthCount > 3}
          onTripClick={onTripClick}
        />
      ))}
    </div>
  );
}

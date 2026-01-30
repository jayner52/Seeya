'use client';

import { useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { addMonths, startOfMonth } from 'date-fns';
import { useCalendarStore } from '@/stores/calendarStore';
import type { CalendarTrip } from '@/types/calendar';
import { VIEW_MODE_CONFIG } from '@/types/calendar';
import { MonthView } from './MonthView';
import { cn } from '@/lib/utils/cn';

interface CalendarGridProps {
  trips: CalendarTrip[];
  onTripClick?: (trip: CalendarTrip) => void;
}

export interface CalendarGridRef {
  scrollToToday: () => void;
}

// Generate months array (12 before, 24 after current date like iOS)
function generateMonths(): Date[] {
  const months: Date[] = [];
  const currentMonth = startOfMonth(new Date());
  const monthsBefore = 12;
  const monthsAfter = 24;

  for (let i = -monthsBefore; i <= monthsAfter; i++) {
    months.push(addMonths(currentMonth, i));
  }

  return months;
}

export const CalendarGrid = forwardRef<CalendarGridRef, CalendarGridProps>(
  function CalendarGrid({ trips, onTripClick }, ref) {
    const { viewMode } = useCalendarStore();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const currentMonthRef = useRef<HTMLDivElement>(null);
    const hasScrolledToToday = useRef(false);

    const months = useMemo(() => generateMonths(), []);
    const config = VIEW_MODE_CONFIG[viewMode];

    // Scroll to current month
    const scrollToToday = useCallback(() => {
      if (currentMonthRef.current) {
        currentMonthRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, []);

    // Expose scrollToToday to parent
    useImperativeHandle(ref, () => ({
      scrollToToday,
    }));

    // Auto-scroll to current month on initial render
    useEffect(() => {
      if (!hasScrolledToToday.current && currentMonthRef.current) {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          currentMonthRef.current?.scrollIntoView({
            behavior: 'auto',
            block: 'start',
          });
          hasScrolledToToday.current = true;
        }, 100);
      }
    }, []);

    // Grid columns based on view mode compactness
    const gridCols =
      config.columns === 1
        ? 'grid-cols-1'
        : config.columns === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

    // Find current month index
    const currentMonth = startOfMonth(new Date());
    const currentMonthIndex = months.findIndex(
      (m) => m.getTime() === currentMonth.getTime()
    );

    return (
      <div
        ref={scrollContainerRef}
        className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2"
      >
        <div className={cn('grid gap-4', gridCols)}>
          {months.map((month, index) => (
            <div
              key={month.toISOString()}
              ref={index === currentMonthIndex ? currentMonthRef : undefined}
            >
              <MonthView
                month={month}
                trips={trips}
                compact={config.isCompact}
                extraCompact={config.isExtraCompact}
                onTripClick={onTripClick}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);

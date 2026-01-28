'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCalendarStore } from '@/stores/calendarStore';
import { format, addMonths } from 'date-fns';
import type { CalendarViewMode } from '@/types/calendar';
import { cn } from '@/lib/utils/cn';

const VIEW_OPTIONS: { value: CalendarViewMode; label: string }[] = [
  { value: '1mo', label: '1 Mo' },
  { value: '3mo', label: '3 Mo' },
  { value: '6mo', label: '6 Mo' },
  { value: '12mo', label: '12 Mo' },
];

export function CalendarHeader() {
  const { viewMode, currentDate, setViewMode, navigateMonths, goToToday } = useCalendarStore();

  // Calculate date range display
  const getDateRangeDisplay = () => {
    const monthCount = viewMode === '1mo' ? 1 : viewMode === '3mo' ? 3 : viewMode === '6mo' ? 6 : 12;
    const endDate = addMonths(currentDate, monthCount - 1);

    const startStr = format(currentDate, 'MMM yyyy');
    const endStr = format(endDate, 'MMM yyyy');

    if (startStr === endStr) return startStr;
    return `${format(currentDate, 'MMM yyyy')} - ${endStr}`;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      {/* Left: Navigation */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonths(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => navigateMonths(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>

        <h2 className="text-lg font-semibold text-seeya-text">
          {getDateRangeDisplay()}
        </h2>
      </div>

      {/* Right: View Mode Selector */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setViewMode(option.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === option.value
                ? 'bg-white text-seeya-purple shadow-sm'
                : 'text-seeya-text-secondary hover:text-seeya-text'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

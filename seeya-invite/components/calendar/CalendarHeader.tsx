'use client';

import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCalendarStore } from '@/stores/calendarStore';
import { format } from 'date-fns';
import type { CalendarViewMode } from '@/types/calendar';
import { VIEW_MODE_CONFIG } from '@/types/calendar';
import { cn } from '@/lib/utils/cn';

const VIEW_OPTIONS: CalendarViewMode[] = ['full', 'split', 'grid'];

interface CalendarHeaderProps {
  onScrollToToday?: () => void;
}

export function CalendarHeader({ onScrollToToday }: CalendarHeaderProps) {
  const { viewMode, currentDate, setViewMode, goToToday } = useCalendarStore();

  const handleTodayClick = () => {
    goToToday();
    onScrollToToday?.();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      {/* Left: Today button and date */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTodayClick}
          className="text-seeya-purple hover:text-seeya-purple hover:bg-seeya-purple/10"
        >
          <MapPin size={14} className="mr-1" />
          Today
        </Button>

        <span className="text-sm text-seeya-text-secondary">
          {format(new Date(), 'MMMM yyyy')}
        </span>
      </div>

      {/* Right: View Mode Selector (compactness) */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {VIEW_OPTIONS.map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === mode
                ? 'bg-white text-seeya-purple shadow-sm'
                : 'text-seeya-text-secondary hover:text-seeya-text'
            )}
          >
            {VIEW_MODE_CONFIG[mode].label}
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useCalendarStore } from '@/stores/calendarStore';
import type { TripFilter, CalendarTrip } from '@/types/calendar';
import { cn } from '@/lib/utils/cn';

interface CalendarFiltersProps {
  trips: CalendarTrip[];
}

export function CalendarFilters({ trips }: CalendarFiltersProps) {
  const { filter, setFilter } = useCalendarStore();

  // Count trips by filter
  const myTripsCount = trips.filter((t) => t.role === 'owner').length;
  const sharedCount = trips.filter((t) => t.role !== 'owner').length;

  const filters: { value: TripFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All' },
    { value: 'my_trips', label: 'My Trips', count: myTripsCount },
    { value: 'shared', label: 'Shared', count: sharedCount },
  ];

  return (
    <div className="flex items-center gap-2 mb-4">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => setFilter(f.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
            filter === f.value
              ? 'bg-seeya-purple text-white'
              : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
          )}
        >
          {f.label}
          {f.count !== undefined && f.count > 0 && (
            <span className="ml-1.5 text-xs opacity-75">({f.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

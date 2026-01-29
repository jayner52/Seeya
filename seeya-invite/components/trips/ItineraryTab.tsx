'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, Button } from '@/components/ui';
import { TripBitCard } from './TripBitCard';
import {
  Calendar,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  format,
  parseISO,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from 'date-fns';
import type { TripBit } from '@/types/database';

interface ItineraryTabProps {
  tripBits: TripBit[];
  startDate: string | null;
  endDate: string | null;
  onTripBitClick: (tripBit: TripBit) => void;
  onAddClick: () => void;
}

type ViewMode = 'list' | 'calendar';

export function ItineraryTab({
  tripBits,
  startDate,
  endDate,
  onTripBitClick,
  onAddClick,
}: ItineraryTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarMonth, setCalendarMonth] = useState(
    startDate ? new Date(startDate) : new Date()
  );

  // Group trip bits by date
  const tripBitsByDate = useMemo(() => {
    const grouped: Record<string, TripBit[]> = {};

    tripBits.forEach((bit) => {
      const dateKey = bit.date || 'unscheduled';
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(bit);
    });

    // Sort each day's items by time
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
    });

    return grouped;
  }, [tripBits]);

  // Get sorted date keys
  const sortedDates = useMemo(() => {
    return Object.keys(tripBitsByDate)
      .filter((d) => d !== 'unscheduled')
      .sort();
  }, [tripBitsByDate]);

  // Generate trip days for list view
  const tripDays = useMemo(() => {
    if (!startDate || !endDate) {
      return sortedDates;
    }

    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return eachDayOfInterval({ start, end }).map((d) =>
        format(d, 'yyyy-MM-dd')
      );
    } catch {
      return sortedDates;
    }
  }, [startDate, endDate, sortedDates]);

  // Render list view
  const renderListView = () => (
    <div className="space-y-6">
      {tripDays.map((dateStr, index) => {
        const bits = tripBitsByDate[dateStr] || [];
        const date = parseISO(dateStr);
        const isToday = isSameDay(date, new Date());

        return (
          <div key={dateStr}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex flex-col items-center justify-center',
                  isToday ? 'bg-seeya-purple text-white' : 'bg-gray-100'
                )}
              >
                <span className="text-xs uppercase">
                  {format(date, 'EEE')}
                </span>
                <span className="text-lg font-semibold">
                  {format(date, 'd')}
                </span>
              </div>
              <div>
                <p className="font-medium text-seeya-text">
                  {format(date, 'MMMM d, yyyy')}
                </p>
                <p className="text-sm text-seeya-text-secondary">
                  Day {index + 1}
                </p>
              </div>
            </div>

            {/* Items for this day */}
            {bits.length > 0 ? (
              <div className="ml-6 pl-6 border-l-2 border-gray-200 space-y-2">
                {bits.map((bit) => (
                  <TripBitCard
                    key={bit.id}
                    tripBit={bit}
                    onClick={() => onTripBitClick(bit)}
                  />
                ))}
              </div>
            ) : (
              <div className="ml-6 pl-6 border-l-2 border-gray-200">
                <button
                  onClick={onAddClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-seeya-text-secondary hover:border-seeya-purple hover:text-seeya-purple transition-colors"
                >
                  <Plus size={16} />
                  <span>Add plans for this day</span>
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Unscheduled items */}
      {tripBitsByDate['unscheduled']?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 text-seeya-text-secondary">
              <Calendar size={20} />
            </div>
            <div>
              <p className="font-medium text-seeya-text">Unscheduled</p>
              <p className="text-sm text-seeya-text-secondary">
                Items without a date
              </p>
            </div>
          </div>
          <div className="ml-6 pl-6 border-l-2 border-gray-200 space-y-2">
            {tripBitsByDate['unscheduled'].map((bit) => (
              <TripBitCard
                key={bit.id}
                tripBit={bit}
                onClick={() => onTripBitClick(bit)}
              />
            ))}
          </div>
        </div>
      )}

      {tripBits.length === 0 && (
        <Card variant="outline" padding="lg" className="text-center">
          <p className="text-seeya-text-secondary mb-4">
            No items in your itinerary yet
          </p>
          <Button
            variant="purple"
            leftIcon={<Plus size={16} />}
            onClick={onAddClick}
          >
            Add Your First Item
          </Button>
        </Card>
      )}
    </div>
  );

  // Render calendar view
  const renderCalendarView = () => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const tripInterval = startDate && endDate
      ? { start: parseISO(startDate), end: parseISO(endDate) }
      : null;

    return (
      <div>
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-semibold text-seeya-text">
            {format(calendarMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-seeya-text-secondary py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const bits = tripBitsByDate[dateStr] || [];
            const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
            const isToday = isSameDay(day, new Date());
            const inTripRange = tripInterval
              ? isWithinInterval(day, tripInterval)
              : false;

            return (
              <div
                key={dateStr}
                className={cn(
                  'min-h-[80px] p-1 rounded-lg border transition-colors',
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                  inTripRange && 'bg-seeya-purple/5 border-seeya-purple/20',
                  !inTripRange && 'border-gray-100'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1',
                    isToday && 'bg-seeya-purple text-white',
                    !isToday && !isCurrentMonth && 'text-gray-400',
                    !isToday && isCurrentMonth && 'text-seeya-text'
                  )}
                >
                  {format(day, 'd')}
                </div>
                {bits.slice(0, 2).map((bit) => (
                  <button
                    key={bit.id}
                    onClick={() => onTripBitClick(bit)}
                    className="w-full text-left text-xs p-1 rounded bg-seeya-purple/10 text-seeya-purple truncate mb-0.5 hover:bg-seeya-purple/20"
                  >
                    {bit.title}
                  </button>
                ))}
                {bits.length > 2 && (
                  <span className="text-xs text-seeya-text-secondary pl-1">
                    +{bits.length - 2} more
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* View mode toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-white text-seeya-purple shadow-sm'
                : 'text-seeya-text-secondary'
            )}
          >
            <List size={16} />
            <span>List</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'calendar'
                ? 'bg-white text-seeya-purple shadow-sm'
                : 'text-seeya-text-secondary'
            )}
          >
            <Calendar size={16} />
            <span>Calendar</span>
          </button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={onAddClick}
        >
          Add
        </Button>
      </div>

      {viewMode === 'list' ? renderListView() : renderCalendarView()}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isBefore,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface CalendarPickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD
  placeholder?: string;
  className?: string;
}

function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

export function CalendarPicker({
  value,
  onChange,
  minDate,
  placeholder = 'Select date',
  className,
}: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    value ? parseLocalDate(value) : new Date()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selectedDate = value ? parseLocalDate(value) : null;
  const minDateObj = minDate ? parseLocalDate(minDate) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleSelect = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    onChange(dateStr);
    setIsOpen(false);
  };

  const isDisabled = (day: Date) => {
    if (!minDateObj) return false;
    return isBefore(day, minDateObj) && !isSameDay(day, minDateObj);
  };

  const displayValue = value
    ? format(parseLocalDate(value), 'MMM d, yyyy')
    : placeholder;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen && value) {
            setCurrentMonth(parseLocalDate(value));
          }
          setIsOpen(!isOpen);
        }}
        className={cn(
          'w-full mt-1 px-3 py-2 text-sm rounded-lg border text-left flex items-center gap-2 transition-colors',
          value ? 'text-seeya-text' : 'text-gray-400',
          isOpen
            ? 'border-seeya-purple ring-2 ring-seeya-purple/20'
            : 'border-gray-200 hover:border-gray-300'
        )}
      >
        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
        {displayValue}
      </button>

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-[280px]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-seeya-text">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((day) => {
              const inMonth = isSameMonth(day, currentMonth);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const disabled = isDisabled(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => !disabled && handleSelect(day)}
                  disabled={disabled}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm flex items-center justify-center transition-colors',
                    !inMonth && 'text-gray-300',
                    inMonth && !selected && !disabled && 'text-seeya-text hover:bg-gray-100',
                    selected && 'bg-seeya-purple text-white font-medium',
                    disabled && 'text-gray-200 cursor-not-allowed'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

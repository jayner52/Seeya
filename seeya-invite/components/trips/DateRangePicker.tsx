'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Calendar, X } from 'lucide-react';
import { format, addDays, isBefore, isAfter, isSameDay, startOfDay } from 'date-fns';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
  flexible?: boolean;
  onFlexibleChange?: (flexible: boolean) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  flexible = false,
  onFlexibleChange,
  className,
}: DateRangePickerProps) {
  const [showCalendar, setShowCalendar] = useState<'start' | 'end' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return 'Select date';
    return format(new Date(dateStr), 'MMM d, yyyy');
  };

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    if (showCalendar === 'start') {
      onStartDateChange(dateStr);
      // If end date is before new start date, clear it
      if (endDate && isBefore(new Date(endDate), date)) {
        onEndDateChange(null);
      }
      setShowCalendar('end');
    } else if (showCalendar === 'end') {
      onEndDateChange(dateStr);
      setShowCalendar(null);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;

    if (showCalendar === 'end' && startDate) {
      return isBefore(date, new Date(startDate));
    }

    return false;
  };

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return isAfter(date, start) && isBefore(date, end);
  };

  const isStartDate = (date: Date) => {
    return startDate && isSameDay(date, new Date(startDate));
  };

  const isEndDate = (date: Date) => {
    return endDate && isSameDay(date, new Date(endDate));
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      0
    ).getDate();

    const firstDayOfMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1
    ).getDay();

    const days: (Date | null)[] = [];

    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i));
    }

    return (
      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 w-[320px]">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-semibold text-seeya-text">
            {format(calendarMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-seeya-text-secondary py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="w-9 h-9" />;
            }

            const disabled = isDateDisabled(date);
            const isStart = isStartDate(date);
            const isEnd = isEndDate(date);
            const inRange = isDateInRange(date);
            const isToday = isSameDay(date, new Date());

            return (
              <button
                key={date.toISOString()}
                type="button"
                disabled={disabled}
                onClick={() => handleDateSelect(date)}
                className={cn(
                  'w-9 h-9 rounded-full text-sm transition-all',
                  disabled && 'text-gray-300 cursor-not-allowed',
                  !disabled && !isStart && !isEnd && !inRange && 'hover:bg-gray-100',
                  isToday && !isStart && !isEnd && 'ring-1 ring-seeya-purple',
                  inRange && 'bg-seeya-purple/10',
                  (isStart || isEnd) && 'bg-seeya-purple text-white',
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
          <button
            type="button"
            onClick={() => setShowCalendar(null)}
            className="flex-1 py-2 text-sm text-seeya-text-secondary hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-seeya-text">
        When are you traveling?
      </label>

      <div className="flex gap-3 relative">
        {/* Start Date */}
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setShowCalendar(showCalendar === 'start' ? null : 'start')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left',
              showCalendar === 'start'
                ? 'border-seeya-purple ring-2 ring-seeya-purple/20'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <Calendar size={18} className="text-seeya-text-secondary" />
            <div className="flex-1">
              <p className="text-xs text-seeya-text-secondary">Start</p>
              <p className={cn('text-sm', startDate ? 'text-seeya-text' : 'text-gray-400')}>
                {formatDisplayDate(startDate)}
              </p>
            </div>
            {startDate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartDateChange(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={14} className="text-seeya-text-secondary" />
              </button>
            )}
          </button>
        </div>

        {/* End Date */}
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setShowCalendar(showCalendar === 'end' ? null : 'end')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left',
              showCalendar === 'end'
                ? 'border-seeya-purple ring-2 ring-seeya-purple/20'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <Calendar size={18} className="text-seeya-text-secondary" />
            <div className="flex-1">
              <p className="text-xs text-seeya-text-secondary">End</p>
              <p className={cn('text-sm', endDate ? 'text-seeya-text' : 'text-gray-400')}>
                {formatDisplayDate(endDate)}
              </p>
            </div>
            {endDate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEndDateChange(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={14} className="text-seeya-text-secondary" />
              </button>
            )}
          </button>
        </div>

        {showCalendar && renderCalendar()}
      </div>

      {/* Flexible dates toggle */}
      {onFlexibleChange && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={flexible}
            onChange={(e) => onFlexibleChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-seeya-purple focus:ring-seeya-purple"
          />
          <span className="text-sm text-seeya-text-secondary">
            My dates are flexible
          </span>
        </label>
      )}
    </div>
  );
}

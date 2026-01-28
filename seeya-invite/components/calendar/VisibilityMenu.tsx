'use client';

import { useState } from 'react';
import { ChevronDown, Check, Eye, EyeOff, Calendar, MapPin, Clock } from 'lucide-react';
import type { CalendarVisibility, VisibilityLevel } from '@/types/calendar';
import { cn } from '@/lib/utils/cn';

interface VisibilityMenuProps {
  tripId: string;
  currentVisibility: VisibilityLevel;
}

const VISIBILITY_OPTIONS: {
  value: CalendarVisibility;
  label: string;
  description: string;
  icon: typeof Eye;
}[] = [
  {
    value: 'follow',
    label: 'Follow trip setting',
    description: 'Use the trip\'s default visibility',
    icon: Eye,
  },
  {
    value: 'hide',
    label: 'Hide from my calendar',
    description: 'Don\'t show this trip on your calendar',
    icon: EyeOff,
  },
  {
    value: 'busy',
    label: 'Show as busy only',
    description: 'Others see you\'re busy, no details',
    icon: Clock,
  },
  {
    value: 'dates',
    label: 'Show dates only',
    description: 'Show trip name and dates, hide location',
    icon: Calendar,
  },
  {
    value: 'location',
    label: 'Show location only',
    description: 'Show trip name and location, hide dates',
    icon: MapPin,
  },
];

export function VisibilityMenu({ tripId, currentVisibility }: VisibilityMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarVisibility>('follow');

  const handleSelect = (value: CalendarVisibility) => {
    setSelected(value);
    setIsOpen(false);
    // TODO: Save to database when calendar_trip_preferences table is created
    // For now, just update local state
  };

  const selectedOption = VISIBILITY_OPTIONS.find((o) => o.value === selected) || VISIBILITY_OPTIONS[0];

  return (
    <div className="relative">
      <label className="text-xs font-medium text-seeya-text-secondary uppercase tracking-wide mb-2 block">
        My visibility for this trip
      </label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2',
          'border border-gray-200 rounded-lg',
          'hover:border-gray-300 transition-colors',
          isOpen && 'border-seeya-purple ring-1 ring-seeya-purple/20'
        )}
      >
        <div className="flex items-center gap-2">
          <selectedOption.icon size={16} className="text-seeya-text-secondary" />
          <span className="text-sm text-seeya-text">{selectedOption.label}</span>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-seeya-text-secondary transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 text-left',
                  'hover:bg-gray-50 transition-colors',
                  selected === option.value && 'bg-seeya-purple/5'
                )}
              >
                <option.icon size={18} className="text-seeya-text-secondary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-seeya-text">
                    {option.label}
                  </div>
                  <div className="text-xs text-seeya-text-secondary">
                    {option.description}
                  </div>
                </div>
                {selected === option.value && (
                  <Check size={16} className="text-seeya-purple flex-shrink-0 mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

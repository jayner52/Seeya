'use client';

import { cn } from '@/lib/utils/cn';
import { Eye, EyeOff, Calendar, MapPin, Globe } from 'lucide-react';
import type { VisibilityLevel } from '@/types/calendar';

interface VisibilitySelectorProps {
  value: VisibilityLevel;
  onChange: (value: VisibilityLevel) => void;
  className?: string;
}

const visibilityOptions: {
  value: VisibilityLevel;
  label: string;
  description: string;
  icon: typeof Eye;
}[] = [
  {
    value: 'full_details',
    label: 'Full Details',
    description: 'Friends can see everything',
    icon: Globe,
  },
  {
    value: 'location_only',
    label: 'Location Only',
    description: 'Show destination, hide dates',
    icon: MapPin,
  },
  {
    value: 'dates_only',
    label: 'Dates Only',
    description: 'Show when, hide where',
    icon: Calendar,
  },
  {
    value: 'busy_only',
    label: 'Busy',
    description: 'Just show I\'m traveling',
    icon: Eye,
  },
  {
    value: 'only_me',
    label: 'Private',
    description: 'Only I can see this trip',
    icon: EyeOff,
  },
];

export function VisibilitySelector({
  value,
  onChange,
  className,
}: VisibilitySelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-seeya-text">
        Who can see this trip?
      </label>
      <div className="space-y-2">
        {visibilityOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-seeya-purple bg-seeya-purple/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  isSelected ? 'bg-seeya-purple/10' : 'bg-gray-100'
                )}
              >
                <Icon
                  size={20}
                  className={isSelected ? 'text-seeya-purple' : 'text-gray-500'}
                />
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    'font-medium',
                    isSelected ? 'text-seeya-purple' : 'text-seeya-text'
                  )}
                >
                  {option.label}
                </p>
                <p className="text-sm text-seeya-text-secondary">
                  {option.description}
                </p>
              </div>
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isSelected ? 'border-seeya-purple' : 'border-gray-300'
                )}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-seeya-purple" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Eye, EyeOff, Calendar, MapPin, Lock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type VisibilityLevel = Database['public']['Enums']['visibility_level'] | null;

interface VisibilityOption {
  value: VisibilityLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const visibilityOptions: VisibilityOption[] = [
  {
    value: null,
    label: 'Follow trip setting',
    description: "Use the trip owner's visibility setting",
    icon: <Eye className="w-4 h-4" />,
  },
  {
    value: 'only_me',
    label: 'Hide from my calendar',
    description: "Won't appear on your calendar or profile",
    icon: <EyeOff className="w-4 h-4" />,
  },
  {
    value: 'busy_only',
    label: 'Show as busy only',
    description: 'Shows dates only, no trip name or location',
    icon: <Lock className="w-4 h-4" />,
  },
  {
    value: 'dates_only',
    label: 'Show dates only',
    description: 'Shows trip name and dates, no location',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    value: 'location_only',
    label: 'Show location only',
    description: 'Shows trip name and location, no dates',
    icon: <MapPin className="w-4 h-4" />,
  },
];

interface TripVisibilityDropdownProps {
  currentVisibility: VisibilityLevel;
  tripVisibility: VisibilityLevel;
  onVisibilityChange: (visibility: VisibilityLevel) => void;
  isLoading?: boolean;
  compact?: boolean;
}

export function TripVisibilityDropdown({
  currentVisibility,
  tripVisibility,
  onVisibilityChange,
  isLoading = false,
  compact = false,
}: TripVisibilityDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = visibilityOptions.find(
    (opt) => opt.value === currentVisibility
  ) || visibilityOptions[0];

  const handleSelect = (visibility: VisibilityLevel) => {
    onVisibilityChange(visibility);
    setOpen(false);
  };

  // Get effective visibility (most restrictive)
  const getEffectiveLabel = () => {
    if (currentVisibility === null) {
      const tripOption = visibilityOptions.find(opt => opt.value === tripVisibility);
      return tripOption?.label || 'Full details';
    }
    return selectedOption.label;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1 h-7 text-xs font-normal text-muted-foreground hover:text-foreground',
            compact && 'px-2'
          )}
          disabled={isLoading}
        >
          {selectedOption.icon}
          {!compact && <span className="hidden sm:inline">{getEffectiveLabel()}</span>}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="space-y-1">
          <div className="px-2 py-1.5 mb-2 border-b border-border">
            <p className="text-xs font-medium">My visibility for this trip</p>
            <p className="text-[10px] text-muted-foreground">
              Control how this trip appears on your calendar & profile
            </p>
          </div>
          {visibilityOptions.map((option) => (
            <button
              key={option.value ?? 'follow'}
              className={cn(
                'w-full flex items-start gap-3 p-2 rounded-md text-left transition-colors hover:bg-accent',
                currentVisibility === option.value && 'bg-accent'
              )}
              onClick={() => handleSelect(option.value)}
            >
              <div className="mt-0.5 text-muted-foreground">
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
                {option.value === null && tripVisibility && (
                  <p className="text-[10px] text-secondary mt-1">
                    Currently: {visibilityOptions.find(o => o.value === tripVisibility)?.label || 'Full details'}
                  </p>
                )}
              </div>
              {currentVisibility === option.value && (
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

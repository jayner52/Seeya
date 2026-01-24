import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plane, Train, Car, Bus, Plus, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tripbit } from '@/hooks/useTripbits';
import { format, parseISO } from 'date-fns';

export type TransportType = 'flight' | 'train' | 'rental_car' | 'bus' | 'rideshare';

interface TransportConnectorProps {
  fromLocation?: string;
  toLocation?: string;
  existingTransport?: Tripbit;
  onAddTransport: (type: TransportType, title: string) => void;
  onTransportClick?: (tripbit: Tripbit) => void;
  canEdit?: boolean;
  className?: string;
}

const transportOptions: { type: TransportType; label: string; icon: React.ElementType; emoji: string }[] = [
  { type: 'flight', label: 'Flight', icon: Plane, emoji: '✈️' },
  { type: 'train', label: 'Train', icon: Train, emoji: '🚄' },
  { type: 'rental_car', label: 'Rental Car', icon: Car, emoji: '🚗' },
  { type: 'bus', label: 'Bus / Shuttle', icon: Bus, emoji: '🚌' },
  { type: 'rideshare', label: 'Taxi / Rideshare', icon: Car, emoji: '🚕' },
];

const categoryToIcon: Record<string, React.ElementType> = {
  flight: Plane,
  train: Train,
  rental_car: Car,
  transportation: Bus,
};

export function TransportConnector({ 
  fromLocation, 
  toLocation, 
  existingTransport,
  onAddTransport, 
  onTransportClick,
  canEdit = true,
  className 
}: TransportConnectorProps) {
  const [open, setOpen] = useState(false);

  const getTitle = (type: TransportType) => {
    const option = transportOptions.find(o => o.type === type);
    if (fromLocation && toLocation) {
      return `${option?.label || 'Transport'}: ${fromLocation} → ${toLocation}`;
    }
    if (toLocation) {
      return `${option?.label || 'Transport'} to ${toLocation}`;
    }
    if (fromLocation) {
      return `${option?.label || 'Transport'} from ${fromLocation}`;
    }
    return option?.label || 'Transport';
  };

  const handleSelect = (type: TransportType) => {
    const title = getTitle(type);
    onAddTransport(type, title);
    setOpen(false);
  };

  // If there's existing transport, show it as a clickable connector
  if (existingTransport) {
    const Icon = categoryToIcon[existingTransport.category] || Plane;
    const metadata = existingTransport.metadata as { 
      airline?: string; 
      flightNumber?: string; 
      departureTime?: string;
      company?: string;
    } | null;
    
    // Build display text
    let displayText = existingTransport.title;
    if (existingTransport.category === 'flight' && metadata) {
      const parts = [metadata.airline, metadata.flightNumber].filter(Boolean);
      if (parts.length > 0) displayText = parts.join(' ');
    } else if (existingTransport.category === 'rental_car' && metadata?.company) {
      displayText = metadata.company;
    }
    
    const dateText = existingTransport.start_date 
      ? format(parseISO(existingTransport.start_date), 'MMM d')
      : null;
    const timeText = metadata?.departureTime;

    return (
      <div className={cn("group relative flex items-center py-3", className)}>
        {/* Connecting line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
        
        {/* Transport chip */}
        <button
          onClick={() => onTransportClick?.(existingTransport)}
          className={cn(
            "relative z-10 ml-0 flex items-center gap-2 px-3 py-1.5 rounded-full",
            "bg-muted/80 hover:bg-muted border border-border/50",
            "transition-all duration-200 text-sm"
          )}
        >
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium truncate max-w-[120px]">{displayText}</span>
          {(dateText || timeText) && (
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              {dateText && <span>{dateText}</span>}
              {timeText && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <Clock className="h-3 w-3" />
                  <span>{timeText}</span>
                </>
              )}
            </span>
          )}
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // No existing transport - show add button
  if (!canEdit) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("group relative flex items-center py-2", className)}>
          {/* Connecting dashed line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 border-l border-dashed border-border/60 group-hover:border-primary/40 transition-colors" />
          
          {/* Center button */}
          <button
            className={cn(
              "relative z-10 ml-0.5 flex items-center gap-1.5 px-2 py-1 rounded-full",
              "bg-background border border-dashed border-border/60",
              "hover:bg-primary/5 hover:border-primary/40",
              "group-hover:border-primary/40",
              "transition-all duration-200 text-xs text-muted-foreground hover:text-foreground"
            )}
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">Add transport</span>
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground px-2 py-1">Add transport</p>
          {transportOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleSelect(option.type)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left"
            >
              <span className="text-base">{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
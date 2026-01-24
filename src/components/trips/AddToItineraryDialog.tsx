import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TripLocation } from '@/hooks/useTripLocations';
import { CalendarPlus, MapPin, Clock, FileText, CalendarIcon } from 'lucide-react';
import { format, parseISO, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddToItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: TripLocation[];
  itemName: string;
  itemDescription?: string;
  itemCategory: 'restaurant' | 'activity' | 'stay' | 'tip';
  tripStartDate?: string;
  tripEndDate?: string;
  onSubmit: (data: {
    locationId: string;
    date?: string;
    time?: string;
    notes?: string;
    category: string;
  }) => Promise<void>;
}

// Map recommendation categories to resource categories
const categoryMapping: Record<string, string> = {
  restaurant: 'reservation',
  activity: 'activity',
  stay: 'accommodation',
  tip: 'other',
};

// Colors for legend dots
const legDotColors = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
];

export function AddToItineraryDialog({
  open,
  onOpenChange,
  locations,
  itemName,
  itemDescription,
  itemCategory,
  tripStartDate,
  tripEndDate,
  onSubmit,
}: AddToItineraryDialogProps) {
  const [locationId, setLocationId] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState(itemDescription || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Memoize parsed trip dates for stable references
  const tripStart = useMemo(() => 
    tripStartDate ? parseISO(tripStartDate) : undefined, 
    [tripStartDate]
  );
  const tripEnd = useMemo(() => 
    tripEndDate ? parseISO(tripEndDate) : undefined, 
    [tripEndDate]
  );

  // Initialize month to trip start or current date
  const [month, setMonth] = useState<Date>(() => 
    tripStartDate ? parseISO(tripStartDate) : new Date()
  );

  // Get the selected location
  const selectedLocation = useMemo(() => 
    locations.find(loc => loc.id === locationId),
    [locations, locationId]
  );

  // Leg colors for inline styles (more reliable than class names)
  const legColorStyles = useMemo(() => [
    { backgroundColor: 'rgba(124, 58, 237, 0.3)' },  // primary/purple
    { backgroundColor: 'rgba(59, 130, 246, 0.3)' },  // blue
    { backgroundColor: 'rgba(20, 184, 166, 0.3)' },  // teal
    { backgroundColor: 'rgba(245, 158, 11, 0.3)' },  // amber
    { backgroundColor: 'rgba(244, 63, 94, 0.3)' },   // rose
    { backgroundColor: 'rgba(99, 102, 241, 0.3)' },  // indigo
  ], []);

  // Create modifiers for highlighting each leg's date range
  const { modifiers, modifiersStyles, locationsWithDates } = useMemo(() => {
    const mods: Record<string, (date: Date) => boolean> = {};
    const modStyles: Record<string, React.CSSProperties> = {};
    const locsWithDates: Array<{ id: string; destination: string; colorIndex: number; start: Date; end: Date }> = [];

    locations.forEach((loc, index) => {
      if (loc.start_date && loc.end_date) {
        const start = parseISO(loc.start_date);
        const end = parseISO(loc.end_date);
        const colorIndex = index % legColorStyles.length;
        const modKey = `leg-${index}`;
        
        mods[modKey] = (d: Date) => isWithinInterval(d, { start, end });
        modStyles[modKey] = legColorStyles[colorIndex];
        
        locsWithDates.push({
          id: loc.id,
          destination: loc.destination,
          colorIndex,
          start,
          end,
        });
      }
    });

    return { modifiers: mods, modifiersStyles: modStyles, locationsWithDates: locsWithDates };
  }, [locations, legColorStyles]);

  // Disabled date function - only allow dates within trip range
  const disabledDays = useMemo(() => (d: Date) => {
    if (!tripStart || !tripEnd) return false;
    return isBefore(d, tripStart) || isAfter(d, tripEnd);
  }, [tripStart, tripEnd]);

  // Reset form and calendar month when dialog opens
  useEffect(() => {
    if (open) {
      setNotes(itemDescription || '');
      setDate(undefined);
      setTime('');
      setLocationId('');
      setCalendarOpen(false); // Reset calendar popover state
      // Reset calendar to trip start month using string prop for stable dependency
      if (tripStartDate) {
        setMonth(parseISO(tripStartDate));
      }
    }
  }, [open, itemDescription, tripStartDate]);

  // When location changes, update calendar month and pre-select date
  useEffect(() => {
    if (selectedLocation?.start_date) {
      const locStart = parseISO(selectedLocation.start_date);
      setDate(locStart);
      setMonth(locStart); // Jump calendar to this month
    }
  }, [selectedLocation]);

  const handleSubmit = async () => {
    if (!locationId) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        locationId,
        date: date ? format(date, 'yyyy-MM-dd') : undefined,
        time: time || undefined,
        notes: notes || undefined,
        category: categoryMapping[itemCategory] || 'other',
      });
      onOpenChange(false);
      // Reset form
      setLocationId('');
      setDate(undefined);
      setTime('');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Add to Itinerary
          </DialogTitle>
          <DialogDescription>
            Schedule "{itemName}" in your trip itinerary
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Location Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location *
            </Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.destination}
                    {loc.start_date && loc.end_date && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({format(parseISO(loc.start_date), 'MMM d')} - {format(parseISO(loc.end_date), 'MMM d')})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date with Calendar */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Date (optional)
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setCalendarOpen(false);
                  }}
                  month={month}
                  onMonthChange={setMonth}
                  disabled={disabledDays}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  className="pointer-events-auto"
                  initialFocus
                />
                
                {/* Legend for trip legs */}
                {locationsWithDates.length > 0 && (
                  <div className="px-3 pb-3 pt-1 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Trip Legs:</p>
                    <div className="flex flex-wrap gap-2">
                      {locationsWithDates.map((loc) => (
                        <div 
                          key={loc.id} 
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <span className={cn("w-2.5 h-2.5 rounded-full", legDotColors[loc.colorIndex])} />
                          <span className="text-muted-foreground">
                            {loc.destination.split(',')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time (optional)
            </Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or details..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!locationId || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add to Itinerary'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

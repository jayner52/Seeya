import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, MapPin, Plane, Home, Car, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { TripLocation } from '@/hooks/useTripLocations';
import { Tripbit } from '@/hooks/useTripbits';

interface InviteSelectionAccordionProps {
  locations: TripLocation[];
  tripbits: Tripbit[];
  selectedLocationIds: string[];
  selectedTripbitIds: string[];
  onLocationToggle: (locationId: string) => void;
  onTripbitToggle: (tripbitId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'flight': return Plane;
    case 'accommodation': return Home;
    case 'rental_car':
    case 'transportation': return Car;
    default: return Calendar;
  }
};

export function InviteSelectionAccordion({
  locations,
  tripbits,
  selectedLocationIds,
  selectedTripbitIds,
  onLocationToggle,
  onTripbitToggle,
  onSelectAll,
  onDeselectAll,
}: InviteSelectionAccordionProps) {
  const [expandedLocations, setExpandedLocations] = useState<string[]>([]);

  const toggleExpanded = (locationId: string) => {
    setExpandedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const getLocationTripbits = (locationId: string) => {
    return tripbits.filter(t => t.location_id === locationId);
  };

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return '';
    const start = parseISO(startDate);
    if (!endDate) return format(start, 'MMM d');
    const end = parseISO(endDate);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
  };

  const allSelected = 
    selectedLocationIds.length === locations.length &&
    selectedTripbitIds.length === tripbits.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Invite to:</span>
        <button
          type="button"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="text-xs text-[hsl(266,50%,45%)] hover:underline"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <div className="space-y-2">
        {locations.map((location) => {
          const locationTripbits = getLocationTripbits(location.id);
          const isExpanded = expandedLocations.includes(location.id);
          const isLocationSelected = selectedLocationIds.includes(location.id);
          const selectedTripbitsInLocation = locationTripbits.filter(t => 
            selectedTripbitIds.includes(t.id)
          ).length;

          return (
            <div key={location.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-card">
                <Checkbox
                  checked={isLocationSelected}
                  onCheckedChange={() => onLocationToggle(location.id)}
                  className="shrink-0"
                />
                <button
                  type="button"
                  onClick={() => toggleExpanded(location.id)}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{location.destination}</div>
                    {location.start_date && (
                      <div className="text-xs text-muted-foreground">
                        {formatDateRange(location.start_date, location.end_date)}
                      </div>
                    )}
                  </div>
                  {locationTripbits.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {selectedTripbitsInLocation}/{locationTripbits.length} tripbits
                      </span>
                      <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                      )} />
                    </div>
                  )}
                </button>
              </div>

              {locationTripbits.length > 0 && (
                <Collapsible open={isExpanded}>
                  <CollapsibleContent>
                    <div className="border-t border-border bg-muted/30 p-2 space-y-1">
                      {locationTripbits.map((tripbit) => {
                        const Icon = getCategoryIcon(tripbit.category);
                        const isTripbitSelected = selectedTripbitIds.includes(tripbit.id);

                        return (
                          <button
                            key={tripbit.id}
                            type="button"
                            onClick={() => onTripbitToggle(tripbit.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-md transition-colors",
                              isTripbitSelected 
                                ? "bg-primary/10" 
                                : "hover:bg-accent/50"
                            )}
                          >
                            <Checkbox
                              checked={isTripbitSelected}
                              onCheckedChange={() => onTripbitToggle(tripbit.id)}
                              className="shrink-0"
                            />
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 text-left min-w-0">
                              <div className="text-sm truncate">{tripbit.title}</div>
                              {tripbit.start_date && (
                                <div className="text-xs text-muted-foreground">
                                  {format(parseISO(tripbit.start_date), 'MMM d')}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
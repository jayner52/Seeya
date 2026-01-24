import { useState, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAllCities, useGooglePlacesSearch, Country, City, PlacePrediction } from '@/hooks/useLocations';
import { MapPin, Globe, Search, Loader2, Plus, X, ChevronUp, ChevronDown, CalendarIcon, CalendarDays, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';

export type DateMode = 'exact' | 'flexible' | 'tbd';

export interface WizardLocation {
  id: string;
  destination: string;
  cityId?: string;
  startDate?: string;
  endDate?: string;
}

interface MultiLocationStepProps {
  locations: WizardLocation[];
  onLocationsChange: (locations: WizardLocation[]) => void;
  dateMode: DateMode;
  onDateModeChange: (mode: DateMode) => void;
  flexibleMonth: string;
  onFlexibleMonthChange: (month: string) => void;
}

// Simple debounce hook
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function MultiLocationStep({ 
  locations, 
  onLocationsChange,
  dateMode,
  onDateModeChange,
  flexibleMonth,
  onFlexibleMonthChange,
}: MultiLocationStepProps) {
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(locations.length === 0 ? 0 : null);

  const debouncedSearch = useDebounceValue(search, 300);

  const { data: allCities = [], isLoading: loadingCities } = useAllCities();
  const { searchPlaces, predictions, isSearching, clearPredictions } = useGooglePlacesSearch();

  // Search Google Places when debounced search changes
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchPlaces(debouncedSearch);
    } else {
      clearPredictions();
    }
  }, [debouncedSearch]);

  // Filter local cities based on search
  const filteredLocalCities = useMemo(() => {
    if (!search) return allCities.slice(0, 15);
    const searchLower = search.toLowerCase();
    return allCities.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.countries?.name.toLowerCase().includes(searchLower) ||
        (c.region && c.region.toLowerCase().includes(searchLower))
    ).slice(0, 10);
  }, [allCities, search]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleLocalCitySelect = (city: City & { countries: Country }) => {
    const destination = `${city.name}, ${city.countries.name}`;
    if (editingIndex !== null) {
      if (editingIndex < locations.length) {
        const newLocations = [...locations];
        newLocations[editingIndex] = {
          ...newLocations[editingIndex],
          destination,
          cityId: city.id,
        };
        onLocationsChange(newLocations);
      } else {
        onLocationsChange([...locations, { id: generateId(), destination, cityId: city.id }]);
      }
    }
    setSearch('');
    setShowList(false);
    setEditingIndex(null);
    clearPredictions();
  };

  const handleGooglePlaceSelect = (prediction: PlacePrediction) => {
    if (editingIndex !== null) {
      if (editingIndex < locations.length) {
        const newLocations = [...locations];
        newLocations[editingIndex] = {
          ...newLocations[editingIndex],
          destination: prediction.description,
          cityId: undefined,
        };
        onLocationsChange(newLocations);
      } else {
        onLocationsChange([...locations, { id: generateId(), destination: prediction.description }]);
      }
    }
    setSearch('');
    setShowList(false);
    setEditingIndex(null);
    clearPredictions();
  };

  const handleAddLocation = () => {
    setEditingIndex(locations.length);
    setSearch('');
    setShowList(true);
  };

  const handleRemoveLocation = (index: number) => {
    const newLocations = locations.filter((_, i) => i !== index);
    onLocationsChange(newLocations);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLocations = [...locations];
    [newLocations[index - 1], newLocations[index]] = [newLocations[index], newLocations[index - 1]];
    onLocationsChange(newLocations);
  };

  const handleMoveDown = (index: number) => {
    if (index === locations.length - 1) return;
    const newLocations = [...locations];
    [newLocations[index], newLocations[index + 1]] = [newLocations[index + 1], newLocations[index]];
    onLocationsChange(newLocations);
  };

  const handleDateRangeChange = (index: number, range: DateRange | undefined) => {
    const newLocations = [...locations];
    newLocations[index] = {
      ...newLocations[index],
      startDate: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      endDate: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    };
    onLocationsChange(newLocations);
  };

  const getDateRange = (location: WizardLocation): DateRange | undefined => {
    const from = location.startDate ? parseISO(location.startDate) : undefined;
    const to = location.endDate ? parseISO(location.endDate) : undefined;
    if (!from && !to) return undefined;
    return { from, to };
  };

  // Generate next 12 months for flexible picker
  const upcomingMonths = Array.from({ length: 12 }, (_, i) => {
    const date = addMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
      shortLabel: format(date, 'MMM'),
      year: format(date, 'yyyy'),
    };
  });

  const handleFlexibleMonthSelect = (month: string) => {
    onFlexibleMonthChange(month);
    // Auto-populate dates with first/last day of month for all locations
    const monthDate = parseISO(`${month}-01`);
    const newLocations = locations.map(loc => ({
      ...loc,
      startDate: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
    }));
    if (newLocations.length > 0) {
      onLocationsChange(newLocations);
    }
  };

  const isAdding = editingIndex !== null && editingIndex >= locations.length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
          <Globe className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl text-foreground mb-2">
          Where are you going?
        </h2>
        <p className="text-muted-foreground">
          Add your destinations and dates
        </p>
      </div>

      {/* Date mode toggle - only show after at least one destination */}
      {locations.length > 0 && (
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
          <Button
            type="button"
            variant={dateMode === 'exact' ? 'default' : 'ghost'}
            size="sm"
            className={cn("flex-1 gap-2", dateMode !== 'exact' && 'hover:bg-secondary')}
            onClick={() => onDateModeChange('exact')}
          >
            <CalendarIcon className="w-4 h-4" />
            Exact dates
          </Button>
          <Button
            type="button"
            variant={dateMode === 'flexible' ? 'default' : 'ghost'}
            size="sm"
            className={cn("flex-1 gap-2", dateMode !== 'flexible' && 'hover:bg-secondary')}
            onClick={() => onDateModeChange('flexible')}
          >
            <CalendarDays className="w-4 h-4" />
            Flexible
          </Button>
          <Button
            type="button"
            variant={dateMode === 'tbd' ? 'default' : 'ghost'}
            size="sm"
            className={cn("flex-1 gap-2", dateMode !== 'tbd' && 'hover:bg-secondary')}
            onClick={() => onDateModeChange('tbd')}
          >
            <HelpCircle className="w-4 h-4" />
            TBD
          </Button>
        </div>
      )}

      {/* Flexible month picker */}
      {dateMode === 'flexible' && locations.length > 0 && (
        <div className="space-y-3">
          <Label className="text-center block text-sm">Pick a month</Label>
          <div className="grid grid-cols-4 gap-2">
            {upcomingMonths.map((month) => (
              <Button
                key={month.value}
                type="button"
                variant={flexibleMonth === month.value ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "flex flex-col h-auto py-2",
                  flexibleMonth !== month.value && "bg-card hover:bg-secondary"
                )}
                onClick={() => handleFlexibleMonthSelect(month.value)}
              >
                <span className="text-xs font-medium">{month.shortLabel}</span>
                <span className="text-[10px] text-muted-foreground">{month.year}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* TBD message */}
      {dateMode === 'tbd' && locations.length > 0 && (
        <div className="p-4 bg-secondary/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Dates will be determined later
          </p>
        </div>
      )}

      {/* Location list */}
      {locations.length > 0 && (
        <div className="space-y-3">
          {locations.map((location, index) => (
            <div 
              key={location.id} 
              className="p-4 bg-card rounded-lg border border-border animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === locations.length - 1}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="bg-primary rounded-full p-1.5">
                    <MapPin className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Stop {index + 1}</span>
                    <p className="font-medium">{location.destination}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveLocation(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Date range picker - only show for exact dates mode */}
              {dateMode === 'exact' && (
                <div className="mt-3">
                  <Label className="text-xs mb-1 block">Dates</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal h-9",
                          !location.startDate && !location.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {location.startDate && location.endDate ? (
                          <>
                            {format(parseISO(location.startDate), "MMM d")} – {format(parseISO(location.endDate), "MMM d")}
                          </>
                        ) : location.startDate ? (
                          <>
                            {format(parseISO(location.startDate), "MMM d")} – Select end
                          </>
                        ) : (
                          "Select dates"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={getDateRange(location)}
                        onSelect={(range) => handleDateRangeChange(index, range)}
                        numberOfMonths={2}
                        initialFocus
                        disabled={(date) => {
                          const prevEnd = index > 0 ? locations[index - 1].endDate : undefined;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return prevEnd ? date < parseISO(prevEnd) : date < today;
                        }}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add location search */}
      {(isAdding || locations.length === 0) && (
        <div className="space-y-2">
          <Label className="text-base font-medium">
            {locations.length === 0 ? 'First Destination' : 'Add Another Stop'}
          </Label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search any city..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowList(true);
                }}
                onFocus={() => setShowList(true)}
                className="pl-10 h-12"
                autoFocus
              />
              {(isSearching || loadingCities) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            {showList && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {/* Google Places Results */}
                {predictions.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b border-border">
                      Search Results
                    </div>
                    {predictions.map((prediction) => (
                      <button
                        key={prediction.place_id}
                        type="button"
                        onClick={() => handleGooglePlaceSelect(prediction)}
                        className="w-full px-4 py-3 text-left hover:bg-accent flex items-center gap-3 transition-colors"
                      >
                        <div className="bg-primary rounded-full p-1 flex-shrink-0">
                          <MapPin className="w-3 h-3 text-primary-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{prediction.main_text}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {prediction.secondary_text}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Local Popular Destinations */}
                {filteredLocalCities.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b border-border">
                      {search ? 'Matching Destinations' : 'Popular Destinations'}
                    </div>
                    {filteredLocalCities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleLocalCitySelect(city)}
                        className="w-full px-4 py-3 text-left hover:bg-accent flex items-center gap-3 transition-colors"
                      >
                        <span className="text-xl flex-shrink-0">{city.countries?.emoji}</span>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{city.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {city.region ? `${city.region}, ` : ''}{city.countries?.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {!isSearching && !loadingCities && predictions.length === 0 && filteredLocalCities.length === 0 && search && (
                  <div className="p-4 text-center text-muted-foreground">
                    No destinations found for "{search}"
                  </div>
                )}
              </div>
            )}
          </div>
          {isAdding && locations.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingIndex(null);
                setSearch('');
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Add more button */}
      {locations.length > 0 && !isAdding && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={handleAddLocation}
        >
          <Plus className="w-4 h-4" />
          Add Another Stop
        </Button>
      )}

      {/* Summary - show for all date modes when we have destinations */}
      {locations.length > 0 && (dateMode !== 'exact' || locations.every(l => l.startDate && l.endDate)) && (
        <div className="p-4 bg-secondary/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Your itinerary</p>
          <div className="flex flex-wrap items-center gap-1">
            {locations.map((loc, idx) => (
              <span key={loc.id} className="flex items-center">
                <span className="font-medium">{loc.destination.split(',')[0]}</span>
                {idx < locations.length - 1 && (
                  <span className="mx-2 text-muted-foreground">→</span>
                )}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {dateMode === 'tbd' && 'Dates TBD'}
            {dateMode === 'flexible' && flexibleMonth && `${format(parseISO(`${flexibleMonth}-01`), 'MMMM yyyy')} (flexible)`}
            {dateMode === 'flexible' && !flexibleMonth && 'Select a month'}
            {dateMode === 'exact' && locations[0].startDate && locations[locations.length - 1].endDate && (
              `${format(parseISO(locations[0].startDate), 'MMM d')} – ${format(parseISO(locations[locations.length - 1].endDate!), 'MMM d, yyyy')}`
            )}
          </p>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAllCities, useGooglePlacesSearch } from '@/hooks/useLocations';
import { TripLocation } from '@/hooks/useTripLocations';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Search, Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface EditLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: TripLocation | null;
  onSave: (locationId: string, data: { destination: string; city_id?: string; start_date?: string | null; end_date?: string | null }) => Promise<{ error?: any }>;
}

export function EditLocationDialog({ open, onOpenChange, location, onSave }: EditLocationDialogProps) {
  const { data: allCities = [] } = useAllCities();
  const { searchPlaces, predictions, isSearching, clearPredictions } = useGooglePlacesSearch();
  const { toast } = useToast();

  const [destination, setDestination] = useState('');
  const [cityId, setCityId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reset form when location changes
  useEffect(() => {
    if (location) {
      setDestination(location.destination);
      setCityId(location.city_id || undefined);
      setDateRange({
        from: location.start_date ? parseISO(location.start_date) : undefined,
        to: location.end_date ? parseISO(location.end_date) : undefined,
      });
      setSearch(location.destination);
    }
  }, [location]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setShowDropdown(true);
    if (value.length >= 2) {
      searchPlaces(value);
    } else {
      clearPredictions();
    }
  };

  const handleSelectDestination = (dest: string, newCityId?: string) => {
    setDestination(dest);
    setCityId(newCityId);
    setSearch(dest);
    setShowDropdown(false);
    clearPredictions();
  };

  const handleSave = async () => {
    if (!location || !destination.trim()) return;

    setSaving(true);
    const { error } = await onSave(location.id, {
      destination: destination.trim(),
      city_id: cityId,
      start_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
      end_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Location updated!' });
      onOpenChange(false);
    }
    setSaving(false);
  };

  const filteredCities = search
    ? allCities.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.countries?.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : [];

  const formatDateRange = () => {
    if (!dateRange?.from) return 'Select dates';
    if (!dateRange.to) return format(dateRange.from, 'MMM d, yyyy');
    return `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Destination field */}
          <div className="space-y-2">
            <Label>Destination</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for a city..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
              )}

              {showDropdown && search && (predictions.length > 0 || filteredCities.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      type="button"
                      onClick={() => handleSelectDestination(prediction.description)}
                      className="w-full px-4 py-3 text-left hover:bg-accent flex items-center gap-3"
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
                  {filteredCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleSelectDestination(`${city.name}, ${city.countries?.name}`, city.id)}
                      className="w-full px-4 py-3 text-left hover:bg-accent flex items-center gap-3"
                    >
                      <span className="text-lg">{city.countries?.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{city.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {city.countries?.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Single date range picker */}
          <div className="space-y-2">
            <Label>Dates (optional)</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    // Close after selecting end date
                    if (range?.from && range?.to) {
                      setCalendarOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {dateRange?.from && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setDateRange(undefined)}
              >
                Clear dates
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !destination.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTripLocations, TripLocation } from '@/hooks/useTripLocations';
import { useAllCities, useGooglePlacesSearch } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Trash2, GripVertical, Search, Loader2, ArrowUp, ArrowDown, Pencil, MoreVertical, CalendarIcon } from 'lucide-react';
import { EditLocationDialog } from './EditLocationDialog';
import { cn } from '@/lib/utils';

interface ManageLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  mainDestination: string;
}

interface PendingLocation {
  destination: string;
  cityId?: string;
}

export function ManageLocationsDialog({ open, onOpenChange, tripId, mainDestination }: ManageLocationsDialogProps) {
  const { locations, loading, addLocation, updateLocation, deleteLocation, reorderLocations } = useTripLocations(tripId);
  const { data: allCities = [] } = useAllCities();
  const { searchPlaces, predictions, isSearching, clearPredictions } = useGooglePlacesSearch();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingLocation, setEditingLocation] = useState<TripLocation | null>(null);
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null);
  const [pendingStartDate, setPendingStartDate] = useState<Date | undefined>();
  const [pendingEndDate, setPendingEndDate] = useState<Date | undefined>();

  const handleSearch = (value: string) => {
    setSearch(value);
    setShowDropdown(true);
    if (value.length >= 2) {
      searchPlaces(value);
    } else {
      clearPredictions();
    }
  };

  const handleSelectLocation = (destination: string, cityId?: string) => {
    setPendingLocation({ destination, cityId });
    setPendingStartDate(undefined);
    setPendingEndDate(undefined);
    setSearch('');
    setShowDropdown(false);
    clearPredictions();
  };

  const handleConfirmAddLocation = async (withDates: boolean) => {
    if (!pendingLocation) return;
    
    setAdding(true);
    const { error } = await addLocation({ 
      destination: pendingLocation.destination, 
      city_id: pendingLocation.cityId,
      start_date: withDates && pendingStartDate ? format(pendingStartDate, 'yyyy-MM-dd') : undefined,
      end_date: withDates && pendingEndDate ? format(pendingEndDate, 'yyyy-MM-dd') : undefined,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Location added!' });
    }
    setPendingLocation(null);
    setPendingStartDate(undefined);
    setPendingEndDate(undefined);
    setAdding(false);
  };

  const handleCancelPending = () => {
    setPendingLocation(null);
    setPendingStartDate(undefined);
    setPendingEndDate(undefined);
  };

  const handleDeleteLocation = async (locationId: string) => {
    const { error } = await deleteLocation(locationId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateLocation = async (locationId: string, data: { destination: string; city_id?: string; start_date?: string | null; end_date?: string | null }) => {
    return await updateLocation(locationId, data);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...locations];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderLocations(newOrder.map(l => l.id));
  };

  const handleMoveDown = async (index: number) => {
    if (index === locations.length - 1) return;
    const newOrder = [...locations];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderLocations(newOrder.map(l => l.id));
  };

  const filteredCities = search
    ? allCities.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.countries?.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Locations & Dates</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Country/Region display */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded-full p-1">
                  <MapPin className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">
                    {mainDestination.split(',').pop()?.trim() || mainDestination}
                  </span>
                  <span className="text-xs text-muted-foreground">Country/Region</span>
                </div>
              </div>
            </div>

            {/* Stops */}
            {locations.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Stops</Label>
                {locations.map((location, index) => (
                  <div
                    key={location.id}
                    className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{location.destination}</span>
                      {location.start_date && (
                        <span className="text-xs text-muted-foreground">
                          {location.start_date}{location.end_date && location.end_date !== location.start_date ? ` – ${location.end_date}` : ''}
                        </span>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => setEditingLocation(location)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit dates
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleMoveUp(index)} 
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-4 h-4 mr-2" />
                          Move up
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleMoveDown(index)} 
                          disabled={index === locations.length - 1}
                        >
                          <ArrowDown className="w-4 h-4 mr-2" />
                          Move down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteLocation(location.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}

            {/* Pending location - date picker dialog */}
            {pendingLocation && (
              <div className="p-4 bg-primary/5 border border-primary/30 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary rounded-full p-1">
                    <MapPin className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="font-medium">{pendingLocation.destination}</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Add Dates (Optional)</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !pendingStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pendingStartDate ? format(pendingStartDate, "MMM d") : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={pendingStartDate}
                          onSelect={setPendingStartDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !pendingEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pendingEndDate ? format(pendingEndDate, "MMM d") : "End"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={pendingEndDate}
                          onSelect={setPendingEndDate}
                          disabled={(date) => pendingStartDate ? date < pendingStartDate : false}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={handleCancelPending} disabled={adding}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={() => handleConfirmAddLocation(false)} disabled={adding}>
                    Skip
                  </Button>
                  <Button onClick={() => handleConfirmAddLocation(true)} disabled={adding}>
                    {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Stop
                  </Button>
                </div>
              </div>
            )}

            {/* Add new location - hide when pending */}
            {!pendingLocation && (
              <div className="space-y-2">
                <Label>Add Location</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for a city..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    className="pl-10"
                  />
                  {(isSearching || adding) && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                  )}

                  {showDropdown && search && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {predictions.map((prediction) => (
                        <button
                          key={prediction.place_id}
                          type="button"
                          onClick={() => handleSelectLocation(prediction.description)}
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
                          onClick={() => handleSelectLocation(`${city.name}, ${city.countries?.name}`, city.id)}
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
                      {!isSearching && predictions.length === 0 && filteredCities.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No results found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditLocationDialog
        open={!!editingLocation}
        onOpenChange={(open) => !open && setEditingLocation(null)}
        location={editingLocation}
        onSave={handleUpdateLocation}
      />
    </>
  );
}

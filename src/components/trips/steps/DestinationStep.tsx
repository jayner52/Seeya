import { useState, useMemo, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAllCities, useGooglePlacesSearch, Country, City, PlacePrediction } from '@/hooks/useLocations';
import { MapPin, Globe, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DestinationStepProps {
  countryId: string;
  cityId: string;
  onCountryChange: (countryId: string, country: Country | null) => void;
  onCityChange: (cityId: string, city: City | null) => void;
  selectedCountry: Country | null;
  selectedCity: City | null;
  onDestinationTextChange?: (text: string) => void;
  destinationText?: string;
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

export function DestinationStep({
  countryId,
  cityId,
  onCountryChange,
  onCityChange,
  selectedCountry,
  selectedCity,
  onDestinationTextChange,
  destinationText = '',
}: DestinationStepProps) {
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    main: string;
    secondary: string;
    placeId?: string;
  } | null>(null);

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
    if (!search) return allCities.slice(0, 20); // Show first 20 popular destinations
    const searchLower = search.toLowerCase();
    return allCities.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.countries?.name.toLowerCase().includes(searchLower) ||
        (c.region && c.region.toLowerCase().includes(searchLower))
    );
  }, [allCities, search]);

  const handleLocalCitySelect = (city: City & { countries: Country }) => {
    onCountryChange(city.country_id, city.countries);
    onCityChange(city.id, city);
    setSelectedPlace({
      main: city.name,
      secondary: city.countries.name,
    });
    setSearch('');
    setShowList(false);
    clearPredictions();
    onDestinationTextChange?.(`${city.name}, ${city.countries.name}`);
  };

  const handleGooglePlaceSelect = (prediction: PlacePrediction) => {
    // For Google Places results, we store the destination text
    // but don't link to our database (city_id stays empty)
    setSelectedPlace({
      main: prediction.main_text,
      secondary: prediction.secondary_text,
      placeId: prediction.place_id,
    });
    onCountryChange('', null);
    onCityChange('', null);
    setSearch('');
    setShowList(false);
    clearPredictions();
    onDestinationTextChange?.(prediction.description);
  };

  const handleClearSelection = () => {
    setSelectedPlace(null);
    onCountryChange('', null);
    onCityChange('', null);
    onDestinationTextChange?.('');
    setSearch('');
  };

  const displayValue = selectedPlace 
    ? `${selectedPlace.main}${selectedPlace.secondary ? `, ${selectedPlace.secondary}` : ''}`
    : selectedCity && selectedCountry
    ? `${selectedCity.name}, ${selectedCountry.name}`
    : search;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
          <Globe className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl text-foreground mb-2">
          Where's your next adventure?
        </h2>
        <p className="text-muted-foreground">
          Search for any city or destination
        </p>
      </div>

      {/* Unified Search */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Destination</Label>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search any city..."
              value={selectedPlace || (selectedCity && selectedCountry) ? displayValue : search}
              onChange={(e) => {
                if (selectedPlace || selectedCity) {
                  handleClearSelection();
                }
                setSearch(e.target.value);
                setShowList(true);
              }}
              onFocus={() => setShowList(true)}
              className="pl-10 h-12"
            />
            {(isSearching || loadingCities) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {showList && !selectedPlace && !selectedCity && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
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
      </div>

      {/* Selected Destination Preview */}
      {(selectedPlace || (selectedCity && selectedCountry)) && (
        <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              {selectedCountry ? (
                <span className="text-3xl">{selectedCountry.emoji}</span>
              ) : (
                <div className="bg-primary rounded-full p-2">
                  <MapPin className="w-6 h-6 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl text-foreground truncate">
                {selectedPlace?.main || selectedCity?.name}
              </h3>
              <p className="text-muted-foreground truncate">
                {selectedPlace?.secondary || selectedCountry?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

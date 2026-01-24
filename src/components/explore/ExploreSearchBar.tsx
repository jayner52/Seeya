import { useState, useRef, useEffect } from 'react';
import { useLocationSearch, LocationResult } from '@/hooks/useLocationSearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, MapPin, Globe } from 'lucide-react';

export interface QuickDestination {
  id: string;
  name: string;
  emoji: string | null;
  count: number;
  country_id?: string | null;
  city_id?: string | null;
  type: 'country' | 'city';
}

interface ExploreSearchBarProps {
  selectedLocation: LocationResult | null;
  onLocationChange: (location: LocationResult | null) => void;
  quickDestinations?: QuickDestination[];
}

export function ExploreSearchBar({ selectedLocation, onLocationChange, quickDestinations = [] }: ExploreSearchBarProps) {
  const { results, isSearching, search, clearResults } = useLocationSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length >= 2) {
      search(value);
      setShowDropdown(true);
    } else {
      clearResults();
      setShowDropdown(false);
    }
  };

  const handleSelectLocation = (location: LocationResult) => {
    onLocationChange(location);
    setSearchQuery('');
    setShowDropdown(false);
    clearResults();
  };

  const handleClearLocation = () => {
    onLocationChange(null);
  };

  const handleQuickSelect = (dest: QuickDestination) => {
    // Toggle off if already selected
    if (selectedLocation?.name === dest.name) {
      onLocationChange(null);
      return;
    }
    
    // Convert to LocationResult format
    const locationResult: LocationResult = {
      id: dest.id,
      name: dest.name,
      type: dest.type,
      countryEmoji: dest.emoji || undefined,
      countryId: dest.country_id || undefined,
      cityId: dest.city_id || undefined,
    };
    onLocationChange(locationResult);
  };

  return (
    <div className="relative mb-6" ref={searchContainerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Where would you like to explore?"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>
      
      {/* Location dropdown */}
      {showDropdown && (results.length > 0 || isSearching) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Searching...
            </div>
          ) : (
            results.map((location) => (
              <button
                key={location.id}
                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                onClick={() => handleSelectLocation(location)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                  {location.type === 'country' ? (
                    <span className="text-lg">{location.countryEmoji}</span>
                  ) : (
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {location.countryEmoji && location.type === 'city' && (
                      <span className="mr-1.5">{location.countryEmoji}</span>
                    )}
                    {location.name}
                  </div>
                  {location.secondaryText && (
                    <div className="text-xs text-muted-foreground truncate">
                      {location.secondaryText}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {location.type}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Quick destination chips */}
      {quickDestinations.length > 0 && (
        <div className="relative mt-3">
          <div className="absolute left-0 top-0 bottom-2 w-4 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-2 w-4 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide scroll-smooth">
            {quickDestinations.map((dest) => {
              const isSelected = selectedLocation?.name === dest.name;
              return (
                <Button
                  key={dest.id}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickSelect(dest)}
                  className="shrink-0 rounded-full gap-1.5 h-8"
                >
                  {dest.emoji && <span>{dest.emoji}</span>}
                  <span>{dest.name}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected location chip */}
      {selectedLocation && (
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm">
          {selectedLocation.type === 'country' ? (
            <Globe className="w-3.5 h-3.5 text-primary" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-primary" />
          )}
          <span>
            {selectedLocation.countryEmoji && (
              <span className="mr-1">{selectedLocation.countryEmoji}</span>
            )}
            {selectedLocation.name}
          </span>
          <button
            onClick={handleClearLocation}
            className="ml-1 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

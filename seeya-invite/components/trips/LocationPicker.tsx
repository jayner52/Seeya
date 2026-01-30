'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { MapPin, X, Plus, GripVertical, Search } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  cityId?: string;
  country?: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
}

interface LocationPickerProps {
  locations: Location[];
  onChange: (locations: Location[]) => void;
  className?: string;
}

interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

export function LocationPicker({
  locations,
  onChange,
  className,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        if (data.predictions) {
          setSearchResults(data.predictions);
        }
      } catch (error) {
        console.error('Error searching places:', error);
      }

      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const addLocation = (place: PlacePrediction) => {
    const newLocation: Location = {
      id: `temp-${Date.now()}`,
      name: place.mainText,
      country: place.secondaryText,
    };
    onChange([...locations, newLocation]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const addCustomLocation = () => {
    if (!searchQuery.trim()) return;

    const newLocation: Location = {
      id: `temp-${Date.now()}`,
      name: searchQuery.trim(),
    };
    onChange([...locations, newLocation]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const removeLocation = (id: string) => {
    onChange(locations.filter((loc) => loc.id !== id));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-seeya-text">
        Where are you going?
      </label>

      {/* Location List */}
      {locations.length > 0 && (
        <div className="space-y-2">
          {locations.map((location, index) => (
            <div
              key={location.id}
              className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl group"
            >
              <button
                type="button"
                className="cursor-grab text-gray-400 hover:text-gray-600"
                title="Drag to reorder"
              >
                <GripVertical size={16} />
              </button>
              <div className="w-8 h-8 rounded-lg bg-seeya-purple/10 flex items-center justify-center">
                <span className="text-sm font-medium text-seeya-purple">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-seeya-text truncate">
                  {location.name}
                </p>
                {location.country && (
                  <p className="text-sm text-seeya-text-secondary">
                    {location.country}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeLocation(location.id)}
                className="p-1.5 text-gray-400 hover:text-seeya-error hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Location */}
      {showSearch ? (
        <div className="relative">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a city..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Search Results */}
          {(searchResults.length > 0 || (searchQuery.length >= 2 && !isSearching)) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-auto">
              {searchResults.map((place) => (
                <button
                  key={place.placeId}
                  type="button"
                  onClick={() => addLocation(place)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                >
                  <MapPin size={18} className="text-seeya-purple shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-seeya-text">{place.mainText}</p>
                    <p className="text-sm text-seeya-text-secondary truncate">{place.secondaryText}</p>
                  </div>
                </button>
              ))}

              {searchQuery.length >= 2 && !isSearching && (
                <button
                  type="button"
                  onClick={addCustomLocation}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-seeya-purple"
                >
                  <Plus size={18} />
                  <span>Add &quot;{searchQuery}&quot; as custom location</span>
                </button>
              )}
            </div>
          )}

          {isSearching && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-seeya-text-secondary">
              Searching...
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-seeya-text-secondary hover:border-seeya-purple hover:text-seeya-purple transition-colors"
        >
          <Plus size={18} />
          <span>Add destination</span>
        </button>
      )}

      {locations.length === 0 && !showSearch && (
        <p className="text-sm text-seeya-text-secondary">
          Add at least one destination to your trip
        </p>
      )}
    </div>
  );
}

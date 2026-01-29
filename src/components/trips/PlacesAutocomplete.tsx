import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MapPin, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  country_code: string;
  country_name: string;
  country_emoji: string;
  city_name?: string;
  types: string[];
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceDetails) => void;
  placeholder?: string;
  countryCodes?: string[]; // Restrict search to these countries
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a place...",
  countryCodes = [],
  className,
  disabled,
  id,
}: PlacesAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const justSelectedRef = useRef(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for places
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Skip search if we just selected a place
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (!value || value.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      console.log('[PlacesAutocomplete] searching:', { query: value, countryCodes });
      try {
        // Use the first country code if available, or don't restrict
        const countryCode = countryCodes.length > 0 ? countryCodes[0] : undefined;
        
        const { data, error } = await supabase.functions.invoke('search-places', {
          body: {
            query: value,
            type: 'establishment',
            countryCode,
          },
        });

        if (error) {
          console.error('[PlacesAutocomplete] search-places error:', error);
          setPredictions([]);
        } else if (data?.predictions) {
          console.log('[PlacesAutocomplete] predictions:', data.predictions.length);
          setPredictions(data.predictions);
          setShowDropdown(data.predictions.length > 0);
        } else {
          console.warn('[PlacesAutocomplete] unexpected response:', data);
          setPredictions([]);
          setShowDropdown(false);
        }
      } catch (err) {
        console.error('[PlacesAutocomplete] search places exception:', err);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, countryCodes]);

  // Handle place selection
  const handleSelect = async (prediction: PlacePrediction) => {
    justSelectedRef.current = true; // Flag to skip next search
    onChange(prediction.main_text);
    setPredictions([]); // Clear predictions immediately
    setShowDropdown(false);
    setSelectedIndex(-1);

    if (onPlaceSelect) {
      // Fetch place details
      try {
        const { data, error } = await supabase.functions.invoke('search-places', {
          body: { placeId: prediction.place_id },
        });

        if (!error && data?.placeDetails) {
          onPlaceSelect(data.placeDetails);
        }
      } catch (err) {
        console.error('Get place details error:', err);
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : predictions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-9 pr-8", className)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ul className="max-h-60 overflow-y-auto py-1">
            {predictions.map((prediction, index) => (
              <li key={prediction.place_id}>
                <button
                  type="button"
                  onClick={() => handleSelect(prediction)}
                  className={cn(
                    "w-full px-3 py-2 text-left flex items-start gap-2 transition-colors",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {prediction.main_text}
                    </div>
                    {prediction.secondary_text && (
                      <div className="text-xs text-muted-foreground truncate">
                        {prediction.secondary_text}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border bg-muted/50">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}

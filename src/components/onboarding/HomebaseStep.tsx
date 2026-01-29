import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Home, MapPin, ArrowRight, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
}

interface HomebaseStepProps {
  onNext: (homebase: { name: string; placeId: string } | null) => void;
  onSkip: () => void;
  initialValue?: string;
}

export function HomebaseStep({ onNext, onSkip, initialValue = '' }: HomebaseStepProps) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; placeId: string } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

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

  // Search for cities
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchValue || searchValue.length < 2 || selectedPlace) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('search-places', {
          body: {
            query: searchValue,
            type: '(cities)', // Restrict to cities only
          },
        });

        if (!error && data?.predictions) {
          setPredictions(data.predictions);
          setShowDropdown(data.predictions.length > 0);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      } catch (err) {
        console.error('[HomebaseStep] search error:', err);
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
  }, [searchValue, selectedPlace]);

  const handleSelect = (prediction: PlacePrediction) => {
    setSearchValue(prediction.description);
    setSelectedPlace({
      name: prediction.description,
      placeId: prediction.place_id,
    });
    setPredictions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (value: string) => {
    setSearchValue(value);
    setSelectedPlace(null); // Clear selection when user types
  };

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
    <>
      <DialogHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center mb-3">
          <Home className="w-8 h-8 text-primary" />
        </div>
        <DialogTitle className="font-display text-2xl">Where's home base?</DialogTitle>
        <DialogDescription className="text-sm">
          We'll use this to find travel pals near you and suggest destinations
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="homebase-search" className="text-sm font-medium">Your city</Label>
          <div ref={containerRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="homebase-search"
                type="text"
                value={searchValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search for your city..."
                className="pl-9 pr-8"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {showDropdown && predictions.length > 0 && (
              <div className="absolute z-[100] w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                <ul className="max-h-48 overflow-y-auto py-1">
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
          
          {selectedPlace && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {selectedPlace.name}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          You can always change this later in settings
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" className="text-muted-foreground" onClick={onSkip}>
          Skip for now
        </Button>
        <Button 
          className="flex-1 gap-2" 
          onClick={() => onNext(selectedPlace)}
          disabled={!selectedPlace}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}

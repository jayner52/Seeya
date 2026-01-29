import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Utensils, Compass, Home, Lightbulb, Loader2, MapPin } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { TripLocation } from '@/hooks/useTripLocations';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { supabase } from '@/integrations/supabase/client';

type RecommendationCategory = Database['public']['Enums']['recommendation_category'];

export interface RecommendationPrefill {
  title?: string;
  description?: string;
  category?: RecommendationCategory;
  tips?: string;
}

interface AddRecommendationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { 
    title: string; 
    description?: string; 
    category: RecommendationCategory; 
    location_id?: string; 
    google_place_id?: string;
    google_place_country_code?: string;
    google_place_country_name?: string;
    google_place_city_name?: string;
  }) => Promise<{ error: any }>;
  locations?: TripLocation[];
  mainDestination?: string;
  prefill?: RecommendationPrefill;
}

const categories: { value: RecommendationCategory; label: string; icon: React.ElementType }[] = [
  { value: 'restaurant', label: 'Restaurant', icon: Utensils },
  { value: 'activity', label: 'Activity', icon: Compass },
  { value: 'stay', label: 'Stay', icon: Home },
  { value: 'tip', label: 'Tip', icon: Lightbulb },
];

// Google Places search is now available for all categories

export function AddRecommendationDialog({ open, onOpenChange, onSubmit, locations = [], mainDestination, prefill }: AddRecommendationDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RecommendationCategory>('tip');
  const [locationId, setLocationId] = useState<string>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [googlePlaceCountryCode, setGooglePlaceCountryCode] = useState<string | null>(null);
  const [googlePlaceCountryName, setGooglePlaceCountryName] = useState<string | null>(null);
  const [googlePlaceCityName, setGooglePlaceCityName] = useState<string | null>(null);

  // Look up country code for filtering Google Places results
  useEffect(() => {
    const getCountryCode = async () => {
      let countryName = '';
      
      // Get country name from selected location or main destination
      if (locationId && locationId !== 'general') {
        const loc = locations.find(l => l.id === locationId);
        countryName = loc?.destination?.split(',').pop()?.trim() || '';
      } else if (mainDestination) {
        // For simple destinations like "Iceland", use as-is
        // For "City, Country" format, extract country
        const parts = mainDestination.split(',');
        countryName = parts.length > 1 ? parts.pop()?.trim() || '' : mainDestination.trim();
      }
      
      if (countryName) {
        const { data } = await supabase
          .from('countries')
          .select('code')
          .ilike('name', countryName)
          .limit(1)
          .maybeSingle();
        
        setCountryCode(data?.code || null);
      } else {
        setCountryCode(null);
      }
    };
    
    getCountryCode();
  }, [locationId, locations, mainDestination]);

  // Apply prefill when dialog opens with prefill data
  useEffect(() => {
    if (open && prefill) {
      if (prefill.title) setTitle(prefill.title);
      if (prefill.category) setCategory(prefill.category);
      // Combine description and tips
      const combinedDesc = [prefill.description, prefill.tips].filter(Boolean).join('\n\n');
      if (combinedDesc) setDescription(combinedDesc);
    }
  }, [open, prefill]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('tip');
    setLocationId('general');
    setGooglePlaceId(null);
    setGooglePlaceCountryCode(null);
    setGooglePlaceCountryName(null);
    setGooglePlaceCityName(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    const { error } = await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      location_id: locationId && locationId !== 'general' ? locationId : undefined,
      google_place_id: googlePlaceId || undefined,
      google_place_country_code: googlePlaceCountryCode || undefined,
      google_place_country_name: googlePlaceCountryName || undefined,
      google_place_city_name: googlePlaceCityName || undefined,
    });
    setIsSubmitting(false);

    if (!error) {
      handleClose();
    }
  };

  const hasMultipleLocations = locations.length > 0;
  const showPlaceAutocomplete = true; // Enable for all categories

  const getPlaceholder = () => {
    switch (category) {
      case 'restaurant':
        return 'Search for a restaurant...';
      case 'activity':
        return 'Search for an activity or place...';
      case 'stay':
        return 'Search for a hotel or stay...';
      default:
        return 'Great café near the museum';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Recommendation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;

                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategory(cat.value);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-xs", isSelected ? "text-primary font-medium" : "text-muted-foreground")}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location selector - only show if there are multiple locations */}
          {hasMultipleLocations && (
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="bg-card">
                <SelectValue placeholder="General / All locations">
                    {locationId && locationId !== 'general' ? (
                      <span className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {locations.find(l => l.id === locationId)?.destination.split(',')[0] || 'Select location'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">General / All locations</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    <span className="text-muted-foreground">General / All locations</span>
                  </SelectItem>
                  {mainDestination && (
                    <SelectItem value="main" disabled>
                      <span className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {mainDestination.split(',')[0]} (main)
                      </span>
                    </SelectItem>
                  )}
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <span className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {loc.destination.split(',')[0]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="recTitle">Title</Label>
            {showPlaceAutocomplete ? (
            <PlacesAutocomplete
                id="recTitle"
                value={title}
                onChange={(val) => {
                  setTitle(val);
                  // Clear google place data when user types manually
                  if (googlePlaceId) {
                    setGooglePlaceId(null);
                    setGooglePlaceCountryCode(null);
                    setGooglePlaceCountryName(null);
                    setGooglePlaceCityName(null);
                  }
                }}
                onPlaceSelect={(place) => {
                  setTitle(place.name);
                  setGooglePlaceId(place.place_id || null);
                  setGooglePlaceCountryCode(place.country_code || null);
                  setGooglePlaceCountryName(place.country_name || null);
                  setGooglePlaceCityName(place.city_name || null);
                  // Optionally add address to description if empty
                  if (!description.trim() && place.formatted_address) {
                    setDescription(place.formatted_address);
                  }
                }}
                placeholder={getPlaceholder()}
                countryCodes={countryCode ? [countryCode] : []}
                className="bg-card"
              />
            ) : (
              <Input
                id="recTitle"
                placeholder={getPlaceholder()}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-card"
              />
            )}
            {showPlaceAutocomplete && (
              <p className="text-xs text-muted-foreground">
                Search Google Places or type a custom name
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recDescription">Description (optional)</Label>
            <Textarea
              id="recDescription"
              placeholder="Add more details about your recommendation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-card resize-none"
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              'Add Recommendation'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

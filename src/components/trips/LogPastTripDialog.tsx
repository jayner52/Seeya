import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTrips } from '@/hooks/useTrips';
import { useShareRecommendation } from '@/hooks/useFriendRecommendations';
import { useGoogleCountrySearch, useGooglePlacesSearch, useGoogleEstablishmentSearch, usePlaceDetails, getCountryEmoji } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X, Loader2, MapPin, Star, Globe, Check, ChevronLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogPastTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface CountrySection {
  id: string;
  countryName: string;
  countryPlaceId: string;
  countryCode: string;
  countryEmoji: string;
  cities: TripLeg[];
}

interface TripLeg {
  id: string;
  destination: string;
  googlePlaceId: string;
  startDate?: Date;
  endDate?: Date;
}

interface QuickRecommendation {
  id: string;
  title: string;
  category: 'restaurant' | 'activity' | 'stay' | 'tip';
  rating: number;
  tips: string;
  countryId: string; // Which country section
  cityId?: string; // If attached to a specific city leg
  googlePlaceId?: string; // If selected from Google Places
}

type DateMode = 'specific' | 'month' | 'skip';

const categoryOptions = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'activity', label: 'Activity' },
  { value: 'stay', label: 'Stay' },
  { value: 'tip', label: 'Tip' },
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 20 }, (_, i) => currentYear - i);

export function LogPastTripDialog({ open, onOpenChange, onComplete }: LogPastTripDialogProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { createTrip } = useTrips();
  const { shareRecommendation } = useShareRecommendation();
  const { toast } = useToast();
  const { getPlaceDetails } = usePlaceDetails();

  // Step 1: Countries selection
  const [countries, setCountries] = useState<CountrySection[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const { 
    searchCountries, 
    predictions: countryPredictions, 
    isSearching: isSearchingCountries,
    clearPredictions: clearCountryPredictions 
  } = useGoogleCountrySearch();

  // Step 2: Trip details & cities for each country
  const [tripName, setTripName] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('month');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<string>(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeCitySearch, setActiveCitySearch] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const {
    searchPlaces: searchCities,
    predictions: cityPredictions,
    isSearching: isSearchingCities,
    clearPredictions: clearCityPredictions
  } = useGooglePlacesSearch();

  // Step 3: Recommendations
  const [recommendations, setRecommendations] = useState<QuickRecommendation[]>([]);
  const [recPlaceSearch, setRecPlaceSearch] = useState('');
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const {
    searchEstablishments,
    predictions: establishmentPredictions,
    isSearching: isSearchingEstablishments,
    clearPredictions: clearEstablishmentPredictions
  } = useGoogleEstablishmentSearch();
  const [newRec, setNewRec] = useState({ 
    title: '', 
    category: 'restaurant' as const, 
    rating: 5, 
    tips: '',
    attachToCountry: '',
    attachToCity: '',
    googlePlaceId: '',
  });

  // Debounced country search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (countrySearch.length >= 2) {
        searchCountries(countrySearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [countrySearch]);

  // Debounced city search with country filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (citySearch.length >= 2 && activeCitySearch) {
        const country = countries.find(c => c.id === activeCitySearch);
        if (country?.countryCode) {
          searchCities(citySearch, country.countryCode);
        } else {
          searchCities(citySearch);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [citySearch, activeCitySearch, countries]);

  // Debounced establishment search for recommendations
  useEffect(() => {
    const timer = setTimeout(() => {
      if (recPlaceSearch.length >= 2) {
        // Get country code for filtering if a country is selected
        const countryCode = newRec.attachToCountry 
          ? countries.find(c => c.id === newRec.attachToCountry)?.countryCode 
          : undefined;
        searchEstablishments(recPlaceSearch, countryCode);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [recPlaceSearch, newRec.attachToCountry, countries]);

  const selectCountry = async (prediction: { place_id: string; main_text: string }) => {
    // Get country details including country code
    const details = await getPlaceDetails(prediction.place_id);
    const countryCode = details?.country_code || '';
    const countryEmoji = details?.country_emoji || getCountryEmoji(countryCode);
    
    const newCountry: CountrySection = {
      id: crypto.randomUUID(),
      countryName: prediction.main_text,
      countryPlaceId: prediction.place_id,
      countryCode,
      countryEmoji,
      cities: [],
    };
    setCountries(prev => [...prev, newCountry]);
    setCountrySearch('');
    clearCountryPredictions();
  };

  const removeCountry = (countryId: string) => {
    setCountries(prev => prev.filter(c => c.id !== countryId));
    // Remove recommendations attached to this country
    setRecommendations(prev => prev.filter(r => r.countryId !== countryId));
  };

  const addCityToCountry = (countryId: string, prediction: { place_id: string; main_text: string }) => {
    const newLeg: TripLeg = {
      id: crypto.randomUUID(),
      destination: prediction.main_text,
      googlePlaceId: prediction.place_id,
    };
    setCountries(prev => prev.map(c => 
      c.id === countryId 
        ? { ...c, cities: [...c.cities, newLeg] }
        : c
    ));
    setCitySearch('');
    setActiveCitySearch(null);
    clearCityPredictions();
  };

  const removeCityFromCountry = (countryId: string, cityId: string) => {
    setCountries(prev => prev.map(c => 
      c.id === countryId 
        ? { ...c, cities: c.cities.filter(city => city.id !== cityId) }
        : c
    ));
    // Remove recommendations attached to this city
    setRecommendations(prev => prev.filter(r => r.cityId !== cityId));
  };

  const selectPlaceForRecommendation = (prediction: { place_id: string; main_text: string }) => {
    setNewRec(prev => ({ 
      ...prev, 
      title: prediction.main_text,
      googlePlaceId: prediction.place_id 
    }));
    setRecPlaceSearch('');
    setShowPlaceSearch(false);
    clearEstablishmentPredictions();
  };

  const addRecommendation = () => {
    if (!newRec.title.trim() || !newRec.attachToCountry) return;
    const rec: QuickRecommendation = {
      id: crypto.randomUUID(),
      title: newRec.title,
      category: newRec.category,
      rating: newRec.rating,
      tips: newRec.tips,
      countryId: newRec.attachToCountry,
      cityId: newRec.attachToCity || undefined,
      googlePlaceId: newRec.googlePlaceId || undefined,
    };
    setRecommendations(prev => [...prev, rec]);
    setNewRec({ 
      title: '', 
      category: 'restaurant', 
      rating: 5, 
      tips: '',
      attachToCountry: countries[0]?.id || '',
      attachToCity: '',
      googlePlaceId: '',
    });
  };

  const removeRecommendation = (id: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== id));
  };

  const resetForm = () => {
    setStep(1);
    setCountries([]);
    setCountrySearch('');
    setTripName('');
    setDateMode('month');
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedMonth(months[new Date().getMonth()]);
    setSelectedYear(currentYear);
    setCitySearch('');
    setActiveCitySearch(null);
    setRecommendations([]);
    setRecPlaceSearch('');
    setShowPlaceSearch(false);
    setNewRec({ 
      title: '', 
      category: 'restaurant', 
      rating: 5, 
      tips: '',
      attachToCountry: '',
      attachToCity: '',
      googlePlaceId: '',
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  };

  // Set default attach to when moving to step 3
  useEffect(() => {
    if (step === 3 && countries.length > 0 && !newRec.attachToCountry) {
      setNewRec(prev => ({ ...prev, attachToCountry: countries[0].id }));
    }
  }, [step, countries]);

  const handleSubmit = async () => {
    if (countries.length === 0 || !user) return;

    setIsSubmitting(true);

    // Determine dates based on date mode
    let tripStartDate: string | undefined;
    let tripEndDate: string | undefined;
    let flexibleMonth: string | undefined;

    if (dateMode === 'specific' && startDate && endDate) {
      tripStartDate = format(startDate, 'yyyy-MM-dd');
      tripEndDate = format(endDate, 'yyyy-MM-dd');
    } else if (dateMode === 'month') {
      flexibleMonth = `${selectedMonth} ${selectedYear}`;
    }

    // Build destination string from countries and cities
    const allCities = countries.flatMap(c => c.cities.map(city => city.destination));
    const countryNames = countries.map(c => c.countryName);
    const destination = allCities.length > 0 
      ? `${allCities.join(', ')}, ${countryNames.join(' & ')}`
      : countryNames.join(' & ');

    // Default trip name
    const defaultName = countries.length === 1 
      ? `Trip to ${countries[0].countryName}`
      : `Trip to ${countryNames.slice(0, 2).join(' & ')}${countryNames.length > 2 ? ` +${countryNames.length - 2}` : ''}`;

    // Create the trip
    const { data: trip, error } = await createTrip({
      name: tripName || defaultName,
      destination,
      start_date: tripStartDate,
      end_date: tripEndDate,
      visibility: 'full_details',
      is_flexible_dates: dateMode !== 'specific',
      flexible_month: flexibleMonth,
      is_logged_past_trip: true,
    });

    if (error || !trip) {
      toast({ title: 'Error', description: 'Failed to log trip', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    // Create trip locations for all cities across all countries
    let orderIndex = 0;
    for (const country of countries) {
      for (const city of country.cities) {
        await supabase.from('trip_locations').insert({
          trip_id: trip.id,
          destination: `${city.destination}, ${country.countryName}`,
          start_date: city.startDate ? format(city.startDate, 'yyyy-MM-dd') : null,
          end_date: city.endDate ? format(city.endDate, 'yyyy-MM-dd') : null,
          order_index: orderIndex++,
        });
      }
      // If no cities for a country, add the country itself as a location
      if (country.cities.length === 0) {
        await supabase.from('trip_locations').insert({
          trip_id: trip.id,
          destination: country.countryName,
          order_index: orderIndex++,
        });
      }
    }

    // Save recommendations
    for (const rec of recommendations) {
      const country = countries.find(c => c.id === rec.countryId);
      const city = country?.cities.find(c => c.id === rec.cityId);
      
      await shareRecommendation({
        title: rec.title,
        category: rec.category,
        rating: rec.rating,
        tips: rec.tips || undefined,
        googlePlaceId: rec.googlePlaceId || city?.googlePlaceId || country?.countryPlaceId,
        sourceTripId: trip.id,
      });
    }

    setIsSubmitting(false);
    toast({ 
      title: 'Past trip logged!', 
      description: `${recommendations.length} recommendations saved.` 
    });
    handleClose();
    onComplete?.();
  };

  const getAttachToLabel = () => {
    if (!newRec.attachToCountry) return 'Select location';
    const country = countries.find(c => c.id === newRec.attachToCountry);
    if (!country) return 'Select location';
    if (newRec.attachToCity) {
      const city = country.cities.find(c => c.id === newRec.attachToCity);
      return city ? `${city.destination}, ${country.countryName}` : country.countryName;
    }
    return `${country.countryName} (general)`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-center">
            {step === 1 && 'Where did you travel?'}
            {step === 2 && 'Trip Details'}
            {step === 3 && 'Share your recommendations'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Countries */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm text-center">
              Add one or more countries you visited
            </p>

            {/* Country search */}
            <div className="space-y-2">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a country..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
                {isSearchingCountries && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {countryPredictions.length > 0 && (
                <div className="border rounded-md bg-card shadow-sm max-h-60 overflow-y-auto">
                  {countryPredictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      className="w-full px-3 py-2.5 text-left hover:bg-muted flex items-center gap-2 border-b last:border-b-0"
                      onClick={() => selectCountry(prediction)}
                    >
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{prediction.main_text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected countries */}
            {countries.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Your countries:</Label>
                {countries.map((country) => (
                  <div
                    key={country.id}
                    className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{country.countryEmoji || '🌍'}</span>
                      <span className="font-medium">{country.countryName}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeCountry(country.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={countries.length === 0}
                onClick={() => setStep(2)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Trip Details & Cities */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Trip Name */}
            <div className="space-y-2">
              <Label>Trip Name</Label>
              <Input
                placeholder={`e.g., ${countries.length === 1 ? `Summer in ${countries[0].countryName}` : 'Multi-country Adventure'}`}
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
              />
            </div>

            {/* Date Mode Toggle */}
            <div className="space-y-2">
              <Label>When did you go? (optional)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={dateMode === 'specific' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDateMode('specific')}
                >
                  Specific dates
                </Button>
                <Button
                  type="button"
                  variant={dateMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDateMode('month')}
                >
                  Month & Year
                </Button>
                <Button
                  type="button"
                  variant={dateMode === 'skip' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDateMode('skip')}
                >
                  Skip
                </Button>
              </div>

              {dateMode === 'specific' && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'MMM d, yyyy') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          disabled={(date) => date > new Date()}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'MMM d, yyyy') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => date > new Date() || (startDate && date < startDate)}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {dateMode === 'month' && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Cities for each country */}
            <div className="space-y-4">
              <Label>Add cities (optional)</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Add specific cities to attach recommendations to each place
              </p>
              
              {countries.map((country) => (
                <div key={country.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{country.countryEmoji || '🌍'}</span>
                    <span className="font-medium text-sm">{country.countryName}</span>
                  </div>
                  
                  {/* City search for this country */}
                  {activeCitySearch === country.id ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder={`Search cities in ${country.countryName}...`}
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                          className="pl-10 pr-10"
                          autoFocus
                        />
                        {isSearchingCities ? (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <button
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            onClick={() => {
                              setActiveCitySearch(null);
                              setCitySearch('');
                              clearCityPredictions();
                            }}
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>

                      {cityPredictions.length > 0 && (
                        <div className="border rounded-md bg-card shadow-sm max-h-40 overflow-y-auto">
                          {cityPredictions.map((prediction) => (
                            <button
                              key={prediction.place_id}
                              className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 border-b last:border-b-0"
                              onClick={() => addCityToCountry(country.id, prediction)}
                            >
                              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm">{prediction.main_text}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveCitySearch(country.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add city
                    </Button>
                  )}

                  {/* Added cities */}
                  {country.cities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {country.cities.map((city, index) => (
                        <Badge
                          key={city.id}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          <span className="text-xs text-muted-foreground mr-1">{index + 1}</span>
                          {city.destination}
                          <button
                            onClick={() => removeCityFromCountry(country.id, city.id)}
                            className="ml-1 hover:bg-muted rounded p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Next: Add Recommendations
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Add Recommendations */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm text-center">
              Share your favorite spots from your trip
            </p>

            {/* New recommendation form */}
            <div className="space-y-3 bg-muted/30 rounded-lg p-4">
              {/* Attach to selector */}
              <div className="space-y-2">
                <Label>Attach to location</Label>
                <Select 
                  value={`${newRec.attachToCountry}|${newRec.attachToCity}`}
                  onValueChange={(v) => {
                    const [countryId, cityId] = v.split('|');
                    setNewRec(prev => ({ ...prev, attachToCountry: countryId, attachToCity: cityId || '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <div key={country.id}>
                        <SelectItem value={`${country.id}|`}>
                          <div className="flex items-center gap-2">
                            <span>{country.countryEmoji}</span>
                            {country.countryName} (general)
                          </div>
                        </SelectItem>
                        {country.cities.map((city) => (
                          <SelectItem key={city.id} value={`${country.id}|${city.id}`}>
                            <div className="flex items-center gap-2 pl-4">
                              <MapPin className="w-3 h-3" />
                              {city.destination}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Place search or manual entry */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Place name</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0.5 px-2 text-xs"
                    onClick={() => setShowPlaceSearch(!showPlaceSearch)}
                  >
                    <Search className="w-3 h-3 mr-1" />
                    {showPlaceSearch ? 'Type manually' : 'Search Google Maps'}
                  </Button>
                </div>
                
                {showPlaceSearch ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for a place..."
                        value={recPlaceSearch}
                        onChange={(e) => setRecPlaceSearch(e.target.value)}
                        className="pl-10"
                      />
                      {isSearchingEstablishments && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {establishmentPredictions.length > 0 && (
                      <div className="border rounded-md bg-card shadow-sm max-h-40 overflow-y-auto">
                        {establishmentPredictions.map((prediction) => (
                          <button
                            key={prediction.place_id}
                            className="w-full px-3 py-2 text-left hover:bg-muted border-b last:border-b-0"
                            onClick={() => selectPlaceForRecommendation(prediction)}
                          >
                            <div className="font-medium text-sm">{prediction.main_text}</div>
                            {prediction.secondary_text && (
                              <div className="text-xs text-muted-foreground">{prediction.secondary_text}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Input
                    placeholder="e.g., Joe's Beerhouse"
                    value={newRec.title}
                    onChange={(e) => setNewRec(prev => ({ ...prev, title: e.target.value, googlePlaceId: '' }))}
                  />
                )}
              </div>

              {/* Show selected place */}
              {newRec.title && showPlaceSearch && (
                <div className="flex items-center justify-between bg-primary/5 rounded px-3 py-2">
                  <span className="text-sm font-medium">{newRec.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setNewRec(prev => ({ ...prev, title: '', googlePlaceId: '' }));
                      setShowPlaceSearch(true);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newRec.category}
                    onValueChange={(v: any) => setNewRec(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1 items-center h-10">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRec(prev => ({ ...prev, rating: star }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={cn(
                            'w-5 h-5 transition-colors',
                            star <= newRec.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tips (optional)</Label>
                <Textarea
                  placeholder="Any tips for visitors?"
                  value={newRec.tips}
                  onChange={(e) => setNewRec(prev => ({ ...prev, tips: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button
                onClick={addRecommendation}
                disabled={!newRec.title.trim() || !newRec.attachToCountry}
                className="w-full"
                variant="secondary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Recommendation
              </Button>
            </div>

            {/* Added recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Added recommendations ({recommendations.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {recommendations.map((rec) => {
                    const country = countries.find(c => c.id === rec.countryId);
                    const city = country?.cities.find(c => c.id === rec.cityId);
                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between bg-card border rounded-lg px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {rec.category}
                            </Badge>
                            <span className="font-medium text-sm truncate">{rec.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {city ? `${city.destination}, ${country?.countryName}` : `${country?.countryName} (general)`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  'w-3 h-3',
                                  star <= rec.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-muted-foreground/30'
                                )}
                              />
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeRecommendation(rec.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Trip
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

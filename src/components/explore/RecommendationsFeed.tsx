import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExploreRecommendations } from '@/hooks/useExploreRecommendations';
import { useUpcomingTripsWithCountries, TripWithCountries } from '@/hooks/useUpcomingTripsWithCountries';
import { useSavedRecommendations } from '@/hooks/useSavedRecommendations';
import { useSubscription } from '@/hooks/useSubscription';
import { FriendRecommendationCard } from '@/components/trips/FriendRecommendationCard';
import { FriendRecommendation } from '@/hooks/useFriendRecommendations';
import { SponsoredRecommendationCard, SponsoredRecommendation } from '@/components/explore/SponsoredRecommendationCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Map as MapIcon, X } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { LocationResult } from '@/hooks/useLocationSearch';
import { recommendationCategoryConfig, RecommendationCategory as RecCategory } from '@/lib/recommendationCategoryConfig';
import { cn } from '@/lib/utils';
import { RecommendationsMap } from './RecommendationsMap';
import { supabase } from '@/integrations/supabase/client';

type RecommendationCategory = Database['public']['Enums']['recommendation_category'];

const categoryFilters: { value: RecCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'restaurant', label: 'Food' },
  { value: 'activity', label: 'Activities' },
  { value: 'stay', label: 'Stays' },
  { value: 'tip', label: 'Tips' },
];

// Mock sponsored recommendations for monetization demo
const sponsoredRecommendations: SponsoredRecommendation[] = [
  {
    id: 'sponsored-1',
    title: 'Nobu Malibu',
    description: 'World-renowned Japanese cuisine with stunning oceanfront views. Celebrity hotspot with exceptional sushi and signature dishes.',
    tips: 'Reserve the patio for sunset - absolute must!',
    category: 'restaurant',
    countryEmoji: '🇺🇸',
    countryName: 'United States',
    cityName: 'Malibu',
    rating: 5,
    url: 'https://noburestaurants.com/malibu',
    sponsorName: 'Nobu Hospitality',
  },
  {
    id: 'sponsored-2',
    title: 'Aman Tokyo',
    description: 'Urban sanctuary blending traditional Japanese aesthetics with modern luxury. Exceptional spa and dining experiences.',
    tips: 'Book a room with Mount Fuji views on clear days',
    category: 'stay',
    countryEmoji: '🇯🇵',
    countryName: 'Japan',
    cityName: 'Tokyo',
    rating: 5,
    url: 'https://aman.com/hotels/aman-tokyo',
    sponsorName: 'Aman Resorts',
  },
  {
    id: 'sponsored-3',
    title: 'Northern Lights Tour',
    description: 'Small group aurora borealis expedition with expert guides. Includes hot chocolate and photography tips.',
    tips: 'Best chances September through March - dress in layers!',
    category: 'activity',
    countryEmoji: '🇮🇸',
    countryName: 'Iceland',
    cityName: 'Reykjavik',
    rating: 5,
    url: 'https://guidetoiceland.is',
    sponsorName: 'Guide to Iceland',
  },
];

interface RecommendationsFeedProps {
  selectedLocation?: LocationResult | null;
}

export function RecommendationsFeed({ selectedLocation }: RecommendationsFeedProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { recommendations, loading } = useExploreRecommendations();
  const { trips: upcomingTrips } = useUpcomingTripsWithCountries();
  const { isSaved, saveRecommendation, unsaveRecommendation } = useSavedRecommendations();
  const { showAds } = useSubscription();
  
  const [activeFilter, setActiveFilter] = useState<RecommendationCategory | 'all'>('all');
  const [savedSponsoredIds, setSavedSponsoredIds] = useState<Set<string>>(new Set());
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLocationFilter, setMapLocationFilter] = useState<{ key: string; name: string; emoji?: string } | null>(null);
  const cardsSectionRef = useRef<HTMLDivElement>(null);
  
  // Fetch Mapbox token on component mount
  useEffect(() => {
    if (!mapboxToken && !mapLoading) {
      console.log('Fetching Mapbox token on mount...');
      setMapLoading(true);
      setMapError(null);
      supabase.functions.invoke('get-mapbox-token')
        .then(({ data, error }) => {
          console.log('Mapbox token response:', { data, error });
          if (error) throw error;
          if (data?.token) {
            setMapboxToken(data.token);
          } else {
            throw new Error('No token received');
          }
        })
        .catch((err) => {
          console.error('Failed to fetch Mapbox token:', err);
          setMapError('Unable to load map. Please try again.');
        })
        .finally(() => setMapLoading(false));
    }
  }, []);

  // Toggle save for sponsored recommendations (local state for demo)
  const handleToggleSponsoredSave = (id: string) => {
    setSavedSponsoredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast({ title: 'Removed from wishlist' });
      } else {
        next.add(id);
        toast({ title: 'Saved to wishlist' });
      }
      return next;
    });
  };

  // Apply category filter first
  let filteredRecommendations = activeFilter === 'all'
    ? recommendations
    : recommendations.filter(rec => rec.category === activeFilter);

  // Then apply location filter if selected (from search bar)
  if (selectedLocation) {
    if (selectedLocation.type === 'country') {
      filteredRecommendations = filteredRecommendations.filter(
        rec => rec.country_id === selectedLocation.countryId || 
               rec.country?.id === selectedLocation.countryId
      );
    } else if (selectedLocation.type === 'city') {
      filteredRecommendations = filteredRecommendations.filter(
        rec => rec.city_id === selectedLocation.cityId || 
               rec.city?.name?.toLowerCase() === selectedLocation.name.toLowerCase()
      );
    }
  }

  // Apply map location filter if selected (from clicking map marker)
  if (mapLocationFilter) {
    filteredRecommendations = filteredRecommendations.filter(rec => {
      if (!rec.city?.latitude || !rec.city?.longitude) return false;
      const recKey = `${rec.city.latitude.toFixed(4)},${rec.city.longitude.toFixed(4)}`;
      return recKey === mapLocationFilter.key;
    });
  }

  // Handle map marker click
  const handleMapLocationClick = (locationKey: string, cityName: string, countryEmoji?: string) => {
    setMapLocationFilter({ key: locationKey, name: cityName, emoji: countryEmoji });
    // Smooth scroll to cards section
    setTimeout(() => {
      cardsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Find trips that match a recommendation's country
  const getMatchingTrips = (rec: FriendRecommendation): TripWithCountries[] => {
    const recCountryId = rec.country_id || rec.country?.id;
    if (!recCountryId) return [];
    return upcomingTrips.filter(trip => trip.country_ids.includes(recCountryId));
  };

  // Handle navigation to trip with pre-filled recommendation
  const handleAddToTrip = (tripId: string, rec: FriendRecommendation) => {
    navigate(`/trips/${tripId}`, {
      state: {
        addRecommendation: {
          title: rec.title,
          description: rec.description,
          category: rec.category,
          tips: rec.tips,
        },
        scrollTo: 'recommendations',
      }
    });
  };

  const handleToggleSave = async (rec: FriendRecommendation) => {
    try {
      if (isSaved(rec.id)) {
        await unsaveRecommendation(rec.id);
        toast({ title: 'Removed from wishlist' });
      } else {
        await saveRecommendation(rec.id);
        toast({ title: 'Saved to wishlist' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update wishlist', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <section>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categoryFilters.map((filter) => (
            <Skeleton key={filter.value} className="h-9 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categoryFilters.map((filter) => {
          const isActive = activeFilter === filter.value;
          
          // "All" filter uses Sparkles icon with default styling
          if (filter.value === 'all') {
            return (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={cn(
                  "flex items-center gap-1 px-2.5 h-8 rounded-full text-xs font-medium transition-colors shrink-0",
                  isActive 
                    ? "bg-foreground text-background"
                    : "border border-border bg-background hover:bg-muted text-muted-foreground"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {filter.label}
              </button>
            );
          }
          
          // Category filters use their respective config colors and icons
          const config = recommendationCategoryConfig[filter.value];
          const Icon = config.icon;
          
          return (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={cn(
                "flex items-center gap-1 px-2.5 h-8 rounded-full text-xs font-medium transition-colors shrink-0",
                isActive 
                  ? cn(config.bgClass, config.textClass)
                  : "border border-border bg-background hover:bg-muted text-muted-foreground"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive && config.textClass)} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Cards Section - with ref for scroll target */}
      <div ref={cardsSectionRef}>
        {/* Map location filter indicator */}
        {mapLocationFilter && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <MapIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              Showing recommendations in {mapLocationFilter.name} {mapLocationFilter.emoji || ''}
            </span>
            <button
              onClick={() => setMapLocationFilter(null)}
              className="ml-auto p-1 rounded-full hover:bg-primary/20 transition-colors"
              title="Clear location filter"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Recommendations Cards Grid */}
      {filteredRecommendations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-foreground mb-2">
              {mapLocationFilter
                ? `No recommendations found in ${mapLocationFilter.name}`
                : selectedLocation
                  ? `No recommendations found for ${selectedLocation.name}`
                  : activeFilter === 'all'
                    ? 'No recommendations from your circle yet'
                    : `No ${activeFilter} recommendations yet`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              {mapLocationFilter
                ? 'Click elsewhere on the map or clear the filter to see more recommendations.'
                : selectedLocation
                  ? 'Try another destination or clear the filter to see all recommendations.'
                  : 'Recommendations appear here when your travel pals and tripmates share their favorite places from past trips.'}
            </p>
            {!selectedLocation && !mapLocationFilter && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>💡 Add recommendations to your own trips to share with your circle</p>
                <p>🔗 Connect with more travel pals to see their recommendations</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Sponsored Recommendations - filtered by category, hidden for premium users */}
          {showAds && sponsoredRecommendations
            .filter(rec => activeFilter === 'all' || rec.category === activeFilter)
            .map((rec) => (
              <SponsoredRecommendationCard 
                key={rec.id} 
                recommendation={rec}
                isSaved={savedSponsoredIds.has(rec.id)}
                onToggleSave={() => handleToggleSponsoredSave(rec.id)}
              />
            ))}
          
          {/* User Recommendations */}
          {filteredRecommendations.map((rec) => (
            <FriendRecommendationCard
              key={rec.id}
              recommendation={rec}
              matchingTrips={getMatchingTrips(rec)}
              onAddToTrip={(tripId) => handleAddToTrip(tripId, rec)}
              isSaved={isSaved(rec.id)}
              onToggleSave={() => handleToggleSave(rec)}
            />
          ))}
        </div>
      )}
      </div>

      {/* Map Section - Always visible below cards */}
      <div className="pt-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapIcon className="w-5 h-5" />
          Explore on Map
        </h3>
        {mapLoading ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </CardContent>
          </Card>
        ) : mapError ? (
          <Card>
            <CardContent className="p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
              <MapIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-foreground mb-2">Map unavailable</h3>
              <p className="text-sm text-muted-foreground mb-4">{mapError}</p>
              <button
                onClick={() => {
                  setMapError(null);
                  setMapboxToken('');
                }}
                className="text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </CardContent>
          </Card>
        ) : mapboxToken ? (
          <RecommendationsMap 
            recommendations={recommendations.filter(rec => 
              activeFilter === 'all' || rec.category === activeFilter
            )}
            mapboxToken={mapboxToken}
            onLocationClick={handleMapLocationClick}
            selectedLocationKey={mapLocationFilter?.key}
          />
        ) : (
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
              <p className="text-sm text-muted-foreground">Initializing map...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

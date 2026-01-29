import { useState, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { ExploreSearchBar, QuickDestination } from '@/components/explore/ExploreSearchBar';
import { RecommendationsFeed } from '@/components/explore/RecommendationsFeed';
import { TravelingNow } from '@/components/explore/TravelingNow';
import { PopularDestinations } from '@/components/explore/PopularDestinations';
import { TrendingWanderlist } from '@/components/explore/TrendingWanderlist';
import { LocationResult } from '@/hooks/useLocationSearch';
import { useTrendingWanderlist } from '@/hooks/useWanderlist';
import { useDestinationStats } from '@/hooks/useDestinationStats';

export default function Explore() {
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const { items: trendingItems } = useTrendingWanderlist();
  const { destinations: popularDestinations } = useDestinationStats();

  // Combine trending wanderlist and popular destinations into quick chips
  const quickDestinations = useMemo<QuickDestination[]>(() => {
    const combined = new Map<string, QuickDestination>();
    
    // Add trending wanderlist items (countries from friend wanderlists)
    trendingItems
      .filter(item => item.country_id && !item.city_id)
      .forEach(item => {
        combined.set(item.name, {
          id: item.country_id || item.name,
          name: item.name,
          emoji: item.country_emoji,
          count: item.friend_count,
          country_id: item.country_id,
          city_id: null,
          type: 'country',
        });
      });
    
    // Add popular destinations - group by country for quick chips
    popularDestinations.forEach(dest => {
      if (dest.country_name && !combined.has(dest.country_name)) {
        combined.set(dest.country_name, {
          id: dest.country_name,
          name: dest.country_name,
          emoji: dest.country_emoji,
          count: dest.trip_count,
          type: 'country',
        });
      } else if (dest.country_name && combined.has(dest.country_name)) {
        const existing = combined.get(dest.country_name)!;
        existing.count += dest.trip_count;
      }
    });
    
    return Array.from(combined.values()).slice(0, 10);
  }, [trendingItems, popularDestinations]);

  return (
    <PageLayout title="Explore">
      <div className="space-y-8">
        {/* Recommendations Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <div className="bg-primary rounded-full p-1.5">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            Recommendations
          </h2>
          <ExploreSearchBar 
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            quickDestinations={quickDestinations}
          />
        </div>
        
        {/* Recommendations Feed - Now directly under search */}
        <RecommendationsFeed selectedLocation={selectedLocation} />
        
        {/* Traveling Now */}
        <TravelingNow />
        
        {/* Popular Destinations */}
        <PopularDestinations />
        
        {/* Trending Wanderlist */}
        <TrendingWanderlist />
      </div>
    </PageLayout>
  );
}

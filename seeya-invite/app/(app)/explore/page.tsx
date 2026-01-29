'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Spinner } from '@/components/ui';
import {
  SearchBar,
  CategoryFilter,
  CountryChips,
  RecommendationCard,
  TravelingNowSection,
  PopularDestinationsSection,
  TrendingWanderlistSection,
} from '@/components/explore';
import type { RecommendationCategory, Recommendation } from '@/components/explore';
import { Sparkles, MapPin } from 'lucide-react';

interface TravelingFriend {
  id: string;
  fullName: string;
  avatarUrl?: string;
  tripName: string;
  tripId: string;
  destination?: string;
  startDate: string;
  endDate: string;
  isNow: boolean;
}

interface PopularDestination {
  id: string;
  name: string;
  country: string;
  visitCount: number;
  friendCount: number;
}

interface TrendingPlace {
  id: string;
  name: string;
  country: string;
  continent?: string;
  friendsWantToGo: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  }[];
  isInMyWanderlist: boolean;
}

export default function ExplorePage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecommendationCategory>('all');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Data
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [travelingFriends, setTravelingFriends] = useState<TravelingFriend[]>([]);
  const [popularDestinations, setPopularDestinations] = useState<PopularDestination[]>([]);
  const [trendingPlaces, setTrendingPlaces] = useState<TrendingPlace[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  const fetchExploreData = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    // Get friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:profiles!friendships_requester_id_fkey (*),
        addressee:profiles!friendships_addressee_id_fkey (*)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    const friendIds = friendships?.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    ) || [];

    if (friendIds.length > 0) {
      // Get friends' trips for "Traveling Now" and upcoming
      const { data: friendParticipations } = await supabase
        .from('trip_participants')
        .select(`
          user_id,
          trip:trips (
            id,
            name,
            start_date,
            end_date,
            visibility
          )
        `)
        .in('user_id', friendIds)
        .eq('status', 'accepted');

      if (friendParticipations) {
        const friendsMap = new Map<string, any>();
        friendships?.forEach((f) => {
          const profile = f.requester_id === user.id ? f.addressee : f.requester;
          if (profile) {
            friendsMap.set(f.requester_id === user.id ? f.addressee_id : f.requester_id, profile);
          }
        });

        const traveling: TravelingFriend[] = [];

        for (const p of friendParticipations) {
          const trip = p.trip as any;
          if (!trip || trip.visibility === 'only_me') continue;

          const friend = friendsMap.get(p.user_id);
          if (!friend) continue;

          // Check if currently traveling or upcoming in next 30 days
          if (trip.start_date && trip.end_date) {
            const isNow = trip.start_date <= today && trip.end_date >= today;
            const startDate = new Date(trip.start_date);
            const daysUntil = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            if (isNow || (daysUntil > 0 && daysUntil <= 30)) {
              // Get first location
              const { data: locations } = await supabase
                .from('trip_locations')
                .select('name')
                .eq('trip_id', trip.id)
                .order('order_index')
                .limit(1);

              traveling.push({
                id: `${p.user_id}-${trip.id}`,
                fullName: friend.full_name,
                avatarUrl: friend.avatar_url,
                tripName: trip.name,
                tripId: trip.id,
                destination: locations?.[0]?.name,
                startDate: trip.start_date,
                endDate: trip.end_date,
                isNow,
              });
            }
          }
        }

        setTravelingFriends(traveling);

        // Get popular destinations from friends' trips
        const { data: friendLocations } = await supabase
          .from('trip_locations')
          .select(`
            city:cities (id, name, country)
          `)
          .in('trip_id', friendParticipations.filter(p => p.trip).map(p => (p.trip as any).id));

        if (friendLocations) {
          const destCounts = new Map<string, { name: string; country: string; count: number; friends: Set<string> }>();

          friendLocations.forEach((loc: any) => {
            if (!loc.city) return;
            const key = loc.city.id;
            const existing = destCounts.get(key);
            if (existing) {
              existing.count++;
            } else {
              destCounts.set(key, {
                name: loc.city.name,
                country: loc.city.country,
                count: 1,
                friends: new Set(),
              });
            }
          });

          const popular: PopularDestination[] = Array.from(destCounts.entries())
            .map(([id, data]) => ({
              id,
              name: data.name,
              country: data.country,
              visitCount: data.count,
              friendCount: data.friends.size || data.count,
            }))
            .sort((a, b) => b.visitCount - a.visitCount)
            .slice(0, 6);

          setPopularDestinations(popular);
        }
      }

      // Get friends' wanderlist for trending
      const { data: friendWanderlists } = await supabase
        .from('wanderlist_items')
        .select(`
          id,
          user_id,
          place_name,
          city:cities (id, name, country, continent)
        `)
        .in('user_id', friendIds);

      // Get my wanderlist
      const { data: myWanderlist } = await supabase
        .from('wanderlist_items')
        .select('city_id, place_name')
        .eq('user_id', user.id);

      const myWanderlistIds = new Set(myWanderlist?.map(w => w.city_id || w.place_name) || []);

      if (friendWanderlists) {
        const placeMap = new Map<string, TrendingPlace>();
        const friendsMap = new Map<string, any>();
        friendships?.forEach((f) => {
          const profile = f.requester_id === user.id ? f.addressee : f.requester;
          if (profile) {
            friendsMap.set(f.requester_id === user.id ? f.addressee_id : f.requester_id, profile);
          }
        });

        friendWanderlists.forEach((w: any) => {
          const cityId = w.city?.id || w.place_name;
          const friend = friendsMap.get(w.user_id);
          if (!friend) return;

          const existing = placeMap.get(cityId);
          if (existing) {
            existing.friendsWantToGo.push({
              id: friend.id,
              fullName: friend.full_name,
              avatarUrl: friend.avatar_url,
            });
          } else {
            placeMap.set(cityId, {
              id: cityId,
              name: w.city?.name || w.place_name,
              country: w.city?.country || '',
              continent: w.city?.continent,
              friendsWantToGo: [{
                id: friend.id,
                fullName: friend.full_name,
                avatarUrl: friend.avatar_url,
              }],
              isInMyWanderlist: myWanderlistIds.has(cityId),
            });
          }
        });

        const trending = Array.from(placeMap.values())
          .sort((a, b) => b.friendsWantToGo.length - a.friendsWantToGo.length)
          .slice(0, 5);

        setTrendingPlaces(trending);
      }

      // TODO: Get shared recommendations from friends' trips
      // For now, using empty array
      setRecommendations([]);
      setCountries([]);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchExploreData();
  }, [fetchExploreData]);

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      // Category filter
      if (selectedCategory !== 'all' && rec.category !== selectedCategory) {
        return false;
      }

      // Country filter
      if (selectedCountry && rec.countryName !== selectedCountry) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          rec.title.toLowerCase().includes(query) ||
          rec.description?.toLowerCase().includes(query) ||
          rec.cityName?.toLowerCase().includes(query) ||
          rec.countryName?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [recommendations, selectedCategory, selectedCountry, searchQuery]);

  const handleAddToWanderlist = async (placeId: string) => {
    if (!user) return;

    const place = trendingPlaces.find((p) => p.id === placeId);
    if (!place) return;

    const supabase = createClient();

    await supabase.from('wanderlist_items').insert({
      user_id: user.id,
      city_id: placeId.startsWith('temp-') ? null : placeId,
      place_name: place.name,
    });

    // Update local state
    setTrendingPlaces((prev) =>
      prev.map((p) =>
        p.id === placeId ? { ...p, isInMyWanderlist: true } : p
      )
    );
  };

  const handleSaveRecommendation = async (recId: string) => {
    // TODO: Implement when saved_recommendations table exists
    setRecommendations((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, isSaved: true } : r))
    );
  };

  const handleUnsaveRecommendation = async (recId: string) => {
    // TODO: Implement when saved_recommendations table exists
    setRecommendations((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, isSaved: false } : r))
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasNoData =
    recommendations.length === 0 &&
    travelingFriends.length === 0 &&
    popularDestinations.length === 0 &&
    trendingPlaces.length === 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-seeya-text flex items-center gap-2">
          <Sparkles className="text-seeya-purple" size={28} />
          Explore
        </h1>
        <p className="text-seeya-text-secondary mt-1">
          Discover recommendations from your travel circle
        </p>
      </div>

      {hasNoData ? (
        <Card variant="elevated" padding="lg" className="text-center py-16">
          <div className="text-6xl mb-4">🌍</div>
          <h2 className="text-xl font-semibold text-seeya-text mb-2">
            Nothing to explore yet
          </h2>
          <p className="text-seeya-text-secondary max-w-md mx-auto">
            Add friends to your travel circle to see their trips, recommendations, and wanderlists here.
          </p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and filters */}
            <div className="space-y-4">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search recommendations..."
              />
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
              {countries.length > 0 && (
                <CountryChips
                  countries={countries}
                  selectedCountry={selectedCountry}
                  onCountrySelect={setSelectedCountry}
                />
              )}
            </div>

            {/* Recommendations grid */}
            {filteredRecommendations.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredRecommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onSave={handleSaveRecommendation}
                    onUnsave={handleUnsaveRecommendation}
                  />
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              <Card variant="outline" padding="lg" className="text-center">
                <p className="text-seeya-text-secondary">
                  No recommendations match your filters
                </p>
              </Card>
            ) : (
              <Card variant="outline" padding="lg" className="text-center">
                <div className="text-4xl mb-3">💡</div>
                <h3 className="font-semibold text-seeya-text mb-1">
                  No recommendations yet
                </h3>
                <p className="text-sm text-seeya-text-secondary">
                  Recommendations from your friends&apos; trips will appear here
                </p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Traveling Now / Upcoming */}
            <TravelingNowSection friends={travelingFriends} />

            {/* Popular Destinations */}
            <PopularDestinationsSection
              destinations={popularDestinations}
              onDestinationClick={(dest) => setSelectedCountry(dest.country)}
            />

            {/* Trending Wanderlist */}
            <TrendingWanderlistSection
              places={trendingPlaces}
              onAddToWanderlist={handleAddToWanderlist}
            />
          </div>
        </div>
      )}
    </div>
  );
}

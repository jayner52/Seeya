'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Spinner } from '@/components/ui';
import {
  TravelingNowSection,
  PopularDestinationsSection,
  TrendingWanderlistSection,
  ExploreAISection,
  AddToTripModal,
} from '@/components/explore';
import { Sparkles } from 'lucide-react';
import type { AIRecommendation } from '@/types';

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

  // Data
  const [travelingFriends, setTravelingFriends] = useState<TravelingFriend[]>([]);
  const [popularDestinations, setPopularDestinations] = useState<PopularDestination[]>([]);
  const [trendingPlaces, setTrendingPlaces] = useState<TrendingPlace[]>([]);

  // Add to trip modal
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

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
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchExploreData();
  }, [fetchExploreData]);

  const handleAddToTrip = (recommendation: AIRecommendation) => {
    setSelectedRecommendation(recommendation);
  };

  const handleAddSuccess = (tripId: string, tripName: string) => {
    if (selectedRecommendation) {
      setAddedIds(prev => new Set([...Array.from(prev), selectedRecommendation.id]));
    }
    setSelectedRecommendation(null);
    setShowSuccessToast(`Added to ${tripName}`);
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

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

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-seeya-text flex items-center gap-2">
          <Sparkles className="text-seeya-purple" size={28} />
          Explore
        </h1>
        <p className="text-seeya-text-secondary mt-1">
          Discover AI recommendations and inspiration from your travel circle
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content - AI Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          <ExploreAISection
            onAddToTrip={handleAddToTrip}
            addedIds={addedIds}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Traveling Now / Upcoming */}
          <TravelingNowSection friends={travelingFriends} />

          {/* Popular Destinations */}
          <PopularDestinationsSection
            destinations={popularDestinations}
            onDestinationClick={() => {}}
          />

          {/* Trending Wanderlist */}
          <TrendingWanderlistSection
            places={trendingPlaces}
            onAddToWanderlist={handleAddToWanderlist}
          />
        </div>
      </div>

      {/* Add to Trip Modal */}
      {selectedRecommendation && (
        <AddToTripModal
          recommendation={selectedRecommendation}
          isOpen={!!selectedRecommendation}
          onClose={() => setSelectedRecommendation(null)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <span>✓</span>
            <span>{showSuccessToast}</span>
          </div>
        </div>
      )}
    </div>
  );
}

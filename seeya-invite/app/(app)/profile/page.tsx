'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Avatar, Spinner } from '@/components/ui';
import {
  ProfileStats,
  ProfileTripsSection,
  WanderlistSection,
  SavedRecommendationsSection,
  EditProfileModal,
  AddToWanderlistModal,
} from '@/components/profile';
import { TravelPalCardCompact } from '@/components/circle';
import { Edit2, Users, ChevronRight, Settings } from 'lucide-react';
import Link from 'next/link';
import type { Trip, Profile } from '@/types/database';
import { getPalColor } from '@/types/calendar';

interface WanderlistItem {
  id: string;
  placeName: string;
  country?: string;
  continent?: string;
  notes?: string;
}

interface SavedRecommendation {
  id: string;
  title: string;
  description?: string;
  category: string;
  rating?: number;
  cityName?: string;
  countryName?: string;
  createdBy?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

interface ProfileStats {
  tripCount: number;
  countriesVisited: number;
  citiesVisited: number;
  recommendationsCount: number;
  travelPalsCount: number;
}

export default function ProfilePage() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWanderlistModal, setShowWanderlistModal] = useState(false);

  // Data
  const [stats, setStats] = useState<ProfileStats>({
    tripCount: 0,
    countriesVisited: 0,
    citiesVisited: 0,
    recommendationsCount: 0,
    travelPalsCount: 0,
  });
  const [upcomingTrips, setUpcomingTrips] = useState<Trip[]>([]);
  const [pastTrips, setPastTrips] = useState<Trip[]>([]);
  const [travelPals, setTravelPals] = useState<Profile[]>([]);
  const [wanderlist, setWanderlist] = useState<WanderlistItem[]>([]);
  const [savedRecommendations, setSavedRecommendations] = useState<SavedRecommendation[]>([]);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone

    // Fetch participations, owned trips, friends, and wanderlist all in parallel
    const [{ data: participations }, { data: ownedTrips }, { data: friendships }, { data: wanderlistData }] = await Promise.all([
      supabase
        .from('trip_participants')
        .select('trip_id')
        .eq('user_id', user.id)
        .eq('status', 'confirmed'),
      supabase
        .from('trips')
        .select('id')
        .eq('user_id', user.id),
      supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey (*),
          addressee:profiles!friendships_addressee_id_fkey (*)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted'),
      supabase
        .from('wanderlist_items')
        .select('id, place_name, notes, country, continent')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    // Process trips - combine participant and owned trip IDs
    const participantTripIds = participations?.map((p) => p.trip_id) || [];
    const ownedTripIds = ownedTrips?.map((t) => t.id) || [];
    const allTripIds = Array.from(new Set([...participantTripIds, ...ownedTripIds]));

    if (allTripIds.length > 0) {
      // Fetch trip details and locations in parallel
      const [{ data: trips }, { data: locations }] = await Promise.all([
        supabase
          .from('trips')
          .select('*')
          .in('id', allTripIds)
          .order('start_date', { ascending: true }),
        supabase
          .from('trip_locations')
          .select('city:cities (name, country:countries (name))')
          .in('trip_id', allTripIds),
      ]);

      if (trips) {
        // A trip is past only when its end_date has passed; fall back to start_date if no end_date
        const upcoming = trips.filter((t) => {
          const end = t.end_date ?? t.start_date;
          return !end || end >= today;
        });
        const past = trips.filter((t) => {
          const end = t.end_date ?? t.start_date;
          return !!end && end < today;
        });
        setUpcomingTrips(upcoming);
        setPastTrips(past.reverse());

        const countries = new Set<string>();
        const cities = new Set<string>();
        locations?.forEach((loc: any) => {
          if (loc.city?.country?.name) countries.add(loc.city.country.name);
          if (loc.city?.name) cities.add(loc.city.name);
        });

        setStats((s) => ({
          ...s,
          tripCount: trips.length,
          countriesVisited: countries.size,
          citiesVisited: cities.size,
        }));
      }
    }

    // Process friends
    if (friendships) {
      const pals = friendships.map((f) =>
        f.requester_id === user.id ? f.addressee : f.requester
      ).filter(Boolean) as Profile[];
      setTravelPals(pals);
      setStats((s) => ({ ...s, travelPalsCount: pals.length }));
    }

    // Process wanderlist
    if (wanderlistData) {
      const items: WanderlistItem[] = wanderlistData.map((item: any) => ({
        id: item.id,
        placeName: item.place_name || 'Unknown',
        notes: item.notes,
        country: item.country ?? undefined,
        continent: item.continent ?? undefined,
      }));
      setWanderlist(items);
    }

    // Fetch saved recommendations
    const { data: savedRecsData } = await supabase
      .from('saved_recommendations')
      .select(`
        id,
        shared_recommendation_id,
        created_at,
        shared_recommendations (
          id,
          user_id,
          city_id,
          country_id,
          title,
          description,
          category,
          rating,
          tips,
          url,
          google_place_id,
          created_at,
          profiles:profiles!shared_recommendations_user_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          city:cities (
            id,
            name
          ),
          country:countries (
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (savedRecsData) {
      const recs: SavedRecommendation[] = savedRecsData.map((item: any) => {
        const sr = item.shared_recommendations;
        return {
          id: item.shared_recommendation_id,
          title: sr?.title || 'Unknown',
          description: sr?.description,
          category: sr?.category || 'tip',
          rating: sr?.rating,
          cityName: sr?.city?.name,
          countryName: sr?.country?.name,
          createdBy: sr?.profiles ? {
            id: sr.profiles.id,
            fullName: sr.profiles.full_name || 'Unknown',
            avatarUrl: sr.profiles.avatar_url,
          } : undefined,
        };
      });
      setSavedRecommendations(recs);
      setStats((s) => ({ ...s, recommendationsCount: recs.length }));
    } else {
      setSavedRecommendations([]);
      setStats((s) => ({ ...s, recommendationsCount: 0 }));
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleRemoveWanderlistItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('wanderlist_items')
      .delete()
      .eq('id', id);

    if (!error) {
      setWanderlist((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleUnsaveRecommendation = async (id: string) => {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('saved_recommendations')
      .delete()
      .eq('user_id', user.id)
      .eq('shared_recommendation_id', id);

    if (!error) {
      setSavedRecommendations((prev) => prev.filter((rec) => rec.id !== id));
      setStats((s) => ({ ...s, recommendationsCount: Math.max(0, s.recommendationsCount - 1) }));
    }
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    fetchProfile();
  };

  const handleWanderlistSuccess = () => {
    setShowWanderlistModal(false);
    fetchProfileData();
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
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <div className="flex items-start gap-6">
            <Avatar
              name={profile?.full_name || user?.email || 'User'}
              avatarUrl={profile?.avatar_url}
              size="xl"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-display font-semibold text-seeya-text">
                    {profile?.full_name || 'Traveler'}
                  </h1>
                  <p className="text-seeya-text-secondary">{user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit2 size={16} />}
                    onClick={() => setShowEditModal(true)}
                  >
                    Edit
                  </Button>
                  <Link href="/settings">
                    <Button variant="ghost" size="sm">
                      <Settings size={18} />
                    </Button>
                  </Link>
                </div>
              </div>
              {profile?.bio && (
                <p className="mt-4 text-seeya-text">{profile.bio}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <ProfileStats
          tripCount={stats.tripCount}
          countriesVisited={stats.countriesVisited}
          citiesVisited={stats.citiesVisited}
          recommendationsCount={stats.recommendationsCount}
          className="mb-6"
        />

        {/* Main content */}
        <div className="space-y-6">
          {/* Wanderlist */}
          <WanderlistSection
            items={wanderlist}
            onAddClick={() => setShowWanderlistModal(true)}
            onRemoveItem={handleRemoveWanderlistItem}
          />

          {/* Travel Pals */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-seeya-purple" />
                <h2 className="text-lg font-semibold text-seeya-text">Travel Pals</h2>
                <span className="text-sm text-seeya-text-secondary">({travelPals.length})</span>
              </div>
              <Link href="/circle">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight size={16} />}>
                  See All
                </Button>
              </Link>
            </div>

            {travelPals.length > 0 ? (
              <Card variant="outline" padding="sm">
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1 py-2">
                  {travelPals.slice(0, 8).map((pal, index) => (
                    <TravelPalCardCompact
                      key={pal.id}
                      profile={pal}
                      colorDot={getPalColor(index + 1)}
                    />
                  ))}
                </div>
              </Card>
            ) : (
              <Card variant="outline" padding="md" className="text-center py-8">
                <Users size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-seeya-text-secondary">No travel pals yet</p>
                <p className="text-xs text-gray-400 mt-1">Connect with friends to plan trips together</p>
              </Card>
            )}
          </div>

          {/* Trips */}
          <ProfileTripsSection
            upcomingTrips={upcomingTrips}
            pastTrips={pastTrips}
          />

          {/* Saved Recommendations */}
          <SavedRecommendationsSection
            recommendations={savedRecommendations}
            onUnsave={handleUnsaveRecommendation}
          />
        </div>
      </div>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          profile={profile}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Add to Wanderlist Modal */}
      {user && (
        <AddToWanderlistModal
          userId={user.id}
          isOpen={showWanderlistModal}
          onClose={() => setShowWanderlistModal(false)}
          onSuccess={handleWanderlistSuccess}
        />
      )}
    </div>
  );
}

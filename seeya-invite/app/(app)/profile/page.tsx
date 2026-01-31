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
    const today = new Date().toISOString().split('T')[0];

    // Fetch trips where user is a participant
    const { data: participations } = await supabase
      .from('trip_participants')
      .select('trip_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (participations && participations.length > 0) {
      const tripIds = participations.map((p) => p.trip_id);

      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .in('id', tripIds)
        .order('start_date', { ascending: true });

      if (trips) {
        const upcoming = trips.filter(
          (t) => !t.start_date || t.start_date >= today
        );
        const past = trips.filter((t) => t.start_date && t.start_date < today);
        setUpcomingTrips(upcoming);
        setPastTrips(past.reverse());

        // Count unique countries and cities from trips
        const { data: locations } = await supabase
          .from('trip_locations')
          .select('city:cities (country, name)')
          .in('trip_id', tripIds);

        const countries = new Set<string>();
        const cities = new Set<string>();
        locations?.forEach((loc: any) => {
          if (loc.city?.country) countries.add(loc.city.country);
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

    // Fetch travel pals
    const { data: friendships } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:profiles!friendships_requester_id_fkey (*),
        addressee:profiles!friendships_addressee_id_fkey (*)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (friendships) {
      const pals = friendships.map((f) =>
        f.requester_id === user.id ? f.addressee : f.requester
      ).filter(Boolean) as Profile[];
      setTravelPals(pals);
      setStats((s) => ({ ...s, travelPalsCount: pals.length }));
    }

    // Fetch wanderlist
    const { data: wanderlistData } = await supabase
      .from('wanderlist_items')
      .select(`
        id,
        place_name,
        notes,
        city:cities (name, country, continent)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (wanderlistData) {
      const items: WanderlistItem[] = wanderlistData.map((item: any) => ({
        id: item.id,
        placeName: item.place_name || item.city?.name || 'Unknown',
        country: item.city?.country,
        continent: item.city?.continent,
        notes: item.notes,
      }));
      setWanderlist(items);
    }

    // TODO: Fetch saved recommendations when that table exists
    setSavedRecommendations([]);
    setStats((s) => ({ ...s, recommendationsCount: 0 }));

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
    // TODO: Implement when saved_recommendations table exists
    setSavedRecommendations((prev) => prev.filter((rec) => rec.id !== id));
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
          travelPalsCount={stats.travelPalsCount}
          className="mb-6"
        />

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Trips */}
            <ProfileTripsSection
              upcomingTrips={upcomingTrips}
              pastTrips={pastTrips}
            />

            {/* Travel Pals */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-seeya-purple" />
                  <h2 className="text-lg font-semibold text-seeya-text">Travel Pals</h2>
                </div>
                <Link href="/circle">
                  <Button variant="ghost" size="sm" rightIcon={<ChevronRight size={16} />}>
                    See All
                  </Button>
                </Link>
              </div>

              {travelPals.length > 0 ? (
                <Card variant="outline" padding="sm">
                  <div className="flex gap-1 overflow-x-auto py-2">
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
                <Card variant="outline" padding="md" className="text-center">
                  <p className="text-seeya-text-secondary mb-2">No travel pals yet</p>
                  <Link href="/circle">
                    <Button variant="purple" size="sm">
                      Find Friends
                    </Button>
                  </Link>
                </Card>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Wanderlist */}
            <WanderlistSection
              items={wanderlist}
              onAddClick={() => setShowWanderlistModal(true)}
              onRemoveItem={handleRemoveWanderlistItem}
            />

            {/* Saved Recommendations */}
            <SavedRecommendationsSection
              recommendations={savedRecommendations}
              onUnsave={handleUnsaveRecommendation}
            />
          </div>
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

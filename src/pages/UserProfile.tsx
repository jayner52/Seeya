import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Calendar, MapPin, Users, UserPlus, Check, Clock, Pencil } from 'lucide-react';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { WanderlistSection } from '@/components/profile/WanderlistSection';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useToast } from '@/hooks/use-toast';
import { useUserStats } from '@/hooks/useUserStats';
import { useUserRecommendations } from '@/hooks/useUserRecommendations';
import { useUserCountriesAndCities } from '@/hooks/useUserCountriesAndCities';
import { useWanderlist } from '@/hooks/useWanderlist';
import { useLocationSearch, usePopularCountries } from '@/hooks/useLocationSearch';
import { useSavedRecommendations } from '@/hooks/useSavedRecommendations';
import { ProfileStatsCard } from '@/components/trips/ProfileStatsCard';
import { ProfileRecommendationsSection } from '@/components/trips/ProfileRecommendationsSection';
import { SavedRecommendationsSection } from '@/components/profile/SavedRecommendationsSection';
import { format, isPast, isFuture } from 'date-fns';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  bio_visibility?: string;
  trips_visibility?: string;
  recommendations_visibility?: string;
  wanderlist_visibility?: string;
  travel_pals_visibility?: string;
  stats_visibility?: string;
}

interface PublicTrip {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  visibility: string;
  is_flexible_dates: boolean;
  flexible_month: string | null;
}

interface TravelPal {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

type FriendshipStatusType = 'friend' | 'pending_sent' | 'pending_received' | 'none';

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friends, pendingRequests, sendFriendRequestById, acceptRequest, refresh } = useFriends();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<PublicTrip[]>([]);
  const [travelPals, setTravelPals] = useState<TravelPal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const { stats, loading: statsLoading } = useUserStats(userId, user?.id);
  const { recommendations, grouped: recommendationsGrouped, loading: recsLoading } = useUserRecommendations(userId);
  const { countries: visitedCountries, cities: visitedCities, loading: geoLoading } = useUserCountriesAndCities(userId, user?.id);
  const { items: wanderlistItems, loading: wanderlistLoading, addToWanderlist, addCityToCountry, removeFromWanderlist, getGroupedByCountry } = useWanderlist(userId);
  const { results: searchResults, isSearching, searchCountriesOnly, clearResults } = useLocationSearch();
  const { countries: popularCountries } = usePopularCountries();
  const { grouped: savedGrouped, loading: savedLoading, unsaveRecommendation } = useSavedRecommendations();

  const isOwnProfile = user?.id === userId;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [wanderlistSearch, setWanderlistSearch] = useState('');
  const [showWanderlistAdd, setShowWanderlistAdd] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [citySearchResults, setCitySearchResults] = useState<Array<{ place_id: string; main_text: string; secondary_text?: string }>>([]);
  const [isCitySearching, setIsCitySearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const cityDebounceRef = useRef<NodeJS.Timeout>();

  // Get countries grouped with their cities
  const wanderlistCountries = getGroupedByCountry();

  // Debounced search for countries
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (wanderlistSearch.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchCountriesOnly(wanderlistSearch);
      }, 300);
    } else {
      clearResults();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [wanderlistSearch]);

  // Search cities within a country using Google Places
  const handleSearchCities = async (query: string, countryId: string) => {
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    
    if (query.length < 2) {
      setCitySearchResults([]);
      return;
    }

    // Find country name from wanderlist
    const country = wanderlistCountries.find(c => c.country_id === countryId);
    if (!country) return;

    cityDebounceRef.current = setTimeout(async () => {
      setIsCitySearching(true);
      try {
        const response = await supabase.functions.invoke('search-places', {
          body: { 
            query: `${query} ${country.name}`,
            types: '(cities)'
          }
        });

        if (response.data?.predictions) {
          setCitySearchResults(response.data.predictions.map((p: any) => ({
            place_id: p.place_id,
            main_text: p.structured_formatting?.main_text || p.description,
            secondary_text: p.structured_formatting?.secondary_text,
          })));
        } else {
          setCitySearchResults([]);
        }
      } catch (error) {
        console.error('Error searching cities:', error);
        setCitySearchResults([]);
      } finally {
        setIsCitySearching(false);
      }
    }, 300);
  };

  const handleAddCountry = async (country: { id: string; name: string; emoji?: string; countryEmoji?: string; continent?: string }) => {
    // Check if already in wanderlist
    if (wanderlistCountries.some(c => c.country_id === country.id)) {
      toast({ title: 'Already on your Wanderlist', description: `${country.name} is already saved` });
      return;
    }
    await addToWanderlist({
      name: country.name,
      country_id: country.id,
      country_emoji: country.emoji || country.countryEmoji,
      continent: country.continent,
      country_name: country.name,
    });
    setWanderlistSearch('');
    clearResults();
    toast({ title: 'Added to Wanderlist', description: `${country.name} has been saved` });
  };

  const handleAddCityToCountry = async (city: { place_id?: string; main_text?: string; name?: string }, countryId: string) => {
    await addCityToCountry({
      name: city.main_text || city.name || '',
      google_place_id: city.place_id,
      country_id: countryId,
    });
    setCitySearch('');
    setCitySearchResults([]);
  };

  useEffect(() => {
    if (userId && user) {
      fetchUserData();
    }
  }, [userId, user]);

  const fetchUserData = async () => {
    if (!userId || !user) return;

    setLoading(true);

    const viewingOwnProfile = userId === user.id;

    // Check if they're friends
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    setIsFriend(!!friendship);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch profile owner's travel pals and trips (if friends or viewing own profile)
    if (friendship || viewingOwnProfile) {
      // Get friendships where profile owner is requester
      const { data: asRequester } = await supabase
        .from('friendships')
        .select(`
          addressee_id,
          profiles!friendships_addressee_id_fkey (id, username, full_name, avatar_url)
        `)
        .eq('requester_id', userId)
        .eq('status', 'accepted');

      // Get friendships where profile owner is addressee
      const { data: asAddressee } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          profiles!friendships_requester_id_fkey (id, username, full_name, avatar_url)
        `)
        .eq('addressee_id', userId)
        .eq('status', 'accepted');

      const pals: TravelPal[] = [];
      asRequester?.forEach((f: any) => {
        if (f.profiles && f.profiles.id !== user.id) {
          pals.push(f.profiles);
        }
      });
      asAddressee?.forEach((f: any) => {
        if (f.profiles && f.profiles.id !== user.id) {
          pals.push(f.profiles);
        }
      });
      setTravelPals(pals);

      // Use the new RPC function that bypasses RLS and handles visibility
      const { data: userTrips, error } = await supabase.rpc('get_user_public_trips', {
        _viewer_id: user.id,
        _profile_id: userId,
      });

      if (!error && userTrips) {
        setTrips(userTrips as PublicTrip[]);
      }
    }

    setLoading(false);
  };

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const getDisplayValue = (trip: PublicTrip, field: 'destination' | 'dates') => {
    const { visibility } = trip;
    
    if (field === 'destination') {
      if (visibility === 'busy_only' || visibility === 'dates_only') {
        return null;
      }
      return trip.destination;
    }
    
    if (field === 'dates') {
      if (visibility === 'busy_only' || visibility === 'location_only') {
        return null;
      }
      // Handle flexible dates
      if (trip.is_flexible_dates && trip.flexible_month) {
        return trip.flexible_month;
      }
      // Handle missing dates
      if (!trip.start_date || !trip.end_date) {
        return null;
      }
      return `${format(new Date(trip.start_date), 'MMM d')} - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`;
    }
    
    return null;
  };

  const getFriendshipStatus = (palId: string): FriendshipStatusType => {
    // Check if already friends
    if (friends.some(f => f.profile.id === palId)) {
      return 'friend';
    }
    // Check if pending request sent by current user
    if (pendingRequests.some(p => p.isRequester && p.profile.id === palId)) {
      return 'pending_sent';
    }
    // Check if pending request received from this user
    if (pendingRequests.some(p => !p.isRequester && p.profile.id === palId)) {
      return 'pending_received';
    }
    return 'none';
  };

  const getPendingRequestId = (palId: string): string | null => {
    const request = pendingRequests.find(p => !p.isRequester && p.profile.id === palId);
    return request?.id || null;
  };

  const handleAddFriend = async (palId: string) => {
    const { error } = await sendFriendRequestById(palId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Friend request sent!' });
      refresh();
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    const { error } = await acceptRequest(friendshipId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Friend added!' });
      refresh();
    }
  };

  // Helper function to check if current viewer can see a section based on visibility settings
  const canViewSection = (visibilityKey: keyof UserProfile): boolean => {
    if (isOwnProfile) return true;
    
    const visibility = profile?.[visibilityKey] || 'friends_only';
    
    if (visibility === 'public') return true;
    if (visibility === 'friends_only' && isFriend) return true;
    if (visibility === 'private') return false;
    
    return isFriend; // Default to friends_only behavior
  };

  const upcomingTrips = trips.filter(t => isFuture(new Date(t.start_date)) || (isFuture(new Date(t.end_date)) && isPast(new Date(t.start_date))));
  const pastTrips = trips.filter(t => isPast(new Date(t.end_date)));

  if (loading) {
    return (
      <PageLayout title="Profile" subtitle="">
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <PageLayout title="Profile Not Found" subtitle="">
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">This user doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate('/friends')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Travel Circle
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="" subtitle="">
      <Button
        variant="ghost"
        className="mb-6 gap-2"
        onClick={() => navigate('/friends')}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Travel Circle
      </Button>

      {/* Profile Header with Colorful Banner */}
      <Card className="mb-8 animate-fade-in overflow-hidden relative">
        {/* Edit Button - top right */}
        {isOwnProfile && (
          <Button
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 z-10 gap-2 bg-card/80 backdrop-blur-sm"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
        )}
        
        {/* Soft gradient header */}
        <div className="h-24 sm:h-28 bg-gradient-to-br from-purple-300/70 via-rose-200/60 to-amber-200/50 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-300/40 via-transparent to-sky-200/30" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>
        
        <CardContent className="p-6 sm:p-8 -mt-16 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="w-28 h-28 border-4 border-card shadow-elevated ring-2 ring-stone-200/50">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl font-display bg-gradient-to-br from-stone-100 to-amber-50">
                {getInitials(profile.full_name, profile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1 pt-2 sm:pt-4">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {profile.full_name || profile.username}
              </h1>
              <p className="text-muted-foreground">@{profile.username}</p>
              {canViewSection('bio_visibility') && profile.bio && (
                <p className="mt-3 text-foreground/80 max-w-lg">{profile.bio}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                <Badge variant="secondary" className="gap-1">
                  <Users className="w-3 h-3" />
                  Travel Pal
                </Badge>
                <Badge variant="outline">
                  Member since {format(new Date(profile.created_at), 'MMM yyyy')}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      {isOwnProfile && profile && (
        <EditProfileDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={profile}
          onProfileUpdate={fetchUserData}
        />
      )}

      {/* Stats Card - visible based on stats_visibility */}
      {canViewSection('stats_visibility') && (
        <ProfileStatsCard 
          stats={stats} 
          loading={statsLoading || geoLoading}
          trips={trips.map(t => ({ id: t.id, name: t.name, destination: t.destination, start_date: t.start_date, end_date: t.end_date }))}
          recommendations={recommendations}
          countries={visitedCountries}
          cities={visitedCities}
          userName={profile.full_name || profile.username}
        />
      )}

      {!isFriend && !isOwnProfile ? (
        <Card className="animate-fade-in">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              You need to be friends with {profile.full_name || profile.username} to see their trips and travel pals.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Wanderlist Section */}
          {canViewSection('wanderlist_visibility') && (
            <WanderlistSection
              countries={wanderlistCountries}
              isOwnProfile={isOwnProfile}
              userName={profile.full_name || profile.username}
              onRemoveCountry={removeFromWanderlist}
              onRemoveCity={removeFromWanderlist}
              onAddCountry={handleAddCountry}
              onAddCity={handleAddCityToCountry}
              showAddForm={showWanderlistAdd}
              setShowAddForm={setShowWanderlistAdd}
              searchValue={wanderlistSearch}
              setSearchValue={setWanderlistSearch}
              isSearching={isSearching}
              searchResults={searchResults}
              popularCountries={popularCountries}
              onClearResults={clearResults}
              citySearchValue={citySearch}
              setCitySearchValue={setCitySearch}
              isCitySearching={isCitySearching}
              citySearchResults={citySearchResults}
              onSearchCities={handleSearchCities}
              onClearCityResults={() => setCitySearchResults([])}
            />
          )}

          {/* Their Travel Pals */}
          {canViewSection('travel_pals_visibility') && travelPals.length > 0 && (
            <div className="mb-8 animate-fade-in">
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <div className="bg-primary rounded-full p-1.5">
                  <Users className="w-4 h-4 text-primary-foreground" />
                </div>
                Travel Pals ({travelPals.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {travelPals.map((pal) => {
                  const status = getFriendshipStatus(pal.id);
                  const pendingId = getPendingRequestId(pal.id);
                    return (
                    <Card 
                      key={pal.id} 
                      className="overflow-hidden hover:shadow-card transition-shadow cursor-pointer"
                      onClick={() => navigate(`/user/${pal.id}`)}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <Avatar className="w-16 h-16 mb-2">
                          <AvatarImage src={pal.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(pal.full_name, pal.username)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm truncate w-full">
                          {pal.full_name || pal.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate w-full mb-2">
                          @{pal.username}
                        </p>
                        {status === 'pending_sent' && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            Pending
                          </Badge>
                        )}
                        {status === 'pending_received' && pendingId && (
                          <Button 
                            size="sm" 
                            variant="default"
                            className="gap-1 text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptRequest(pendingId);
                            }}
                          >
                            <Check className="w-3 h-3" />
                            Accept
                          </Button>
                        )}
                        {status === 'none' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="gap-1 text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddFriend(pal.id);
                            }}
                          >
                            <UserPlus className="w-3 h-3" />
                            Add
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Trips */}
          {canViewSection('trips_visibility') && upcomingTrips.length > 0 && (
            <div className="mb-8 animate-fade-in">
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <div className="bg-primary rounded-full p-1.5">
                  <Calendar className="w-4 h-4 text-primary-foreground" />
                </div>
                Upcoming Trips ({upcomingTrips.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingTrips.map((trip) => (
                  <Card key={trip.id} className="hover:shadow-card transition-shadow">
                    <CardContent className="p-5">
                      <h3 className="font-display font-semibold text-lg mb-2">
                        {trip.visibility === 'busy_only' ? 'Unavailable' : trip.name}
                      </h3>
                      {getDisplayValue(trip, 'destination') && (
                        <p className="text-muted-foreground flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4" />
                          {getDisplayValue(trip, 'destination')}
                        </p>
                      )}
                      {getDisplayValue(trip, 'dates') && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {getDisplayValue(trip, 'dates')}
                        </p>
                      )}
                      {trip.visibility === 'busy_only' && (
                        <p className="text-sm text-muted-foreground italic">Details hidden</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Trips */}
          {canViewSection('trips_visibility') && pastTrips.length > 0 && (
            <div className="animate-fade-in">
              <h2 className="font-display text-xl font-semibold mb-4 text-muted-foreground">
                Past Trips ({pastTrips.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastTrips.map((trip) => (
                  <Card key={trip.id} className="opacity-80 hover:opacity-100 transition-opacity">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-1">
                        {trip.visibility === 'busy_only' ? 'Past trip' : trip.name}
                      </h3>
                      {getDisplayValue(trip, 'destination') && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {getDisplayValue(trip, 'destination')}
                        </p>
                      )}
                      {getDisplayValue(trip, 'dates') && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {getDisplayValue(trip, 'dates')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations Section */}
          {canViewSection('recommendations_visibility') && Object.keys(recommendationsGrouped).length > 0 && (
            <div className="mt-8">
              <ProfileRecommendationsSection grouped={recommendationsGrouped} loading={recsLoading} />
            </div>
          )}

          {/* Saved Recommendations - only visible to own profile */}
          {isOwnProfile && Object.keys(savedGrouped).length > 0 && (
            <div className="mt-8">
              <SavedRecommendationsSection 
                grouped={savedGrouped} 
                loading={savedLoading}
                onUnsave={async (id) => {
                  await unsaveRecommendation(id);
                  toast({ title: 'Removed from wishlist' });
                }}
              />
            </div>
          )}

          {upcomingTrips.length === 0 && pastTrips.length === 0 && travelPals.length === 0 && Object.keys(recommendationsGrouped).length === 0 && (
            <Card className="animate-fade-in">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {profile.full_name || profile.username} hasn't shared any trips yet.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageLayout>
  );
}

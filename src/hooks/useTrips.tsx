import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAddTripRecommendation } from './useAddTripRecommendation';
import { Database } from '@/integrations/supabase/types';
import { TripLocation } from './useTripLocations';

type VisibilityLevel = Database['public']['Enums']['visibility_level'];
type ParticipationStatus = Database['public']['Enums']['participation_status'];
type RecommendationCategory = Database['public']['Enums']['recommendation_category'];

export interface TripData {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  visibility: VisibilityLevel;
  description: string | null;
  owner_id: string;
  created_at: string;
  isOwner: boolean;
  status: ParticipationStatus | 'owner';
  participants: ParticipantData[];
  is_flexible_dates: boolean;
  flexible_month: string | null;
  is_logged_past_trip: boolean;
  locations?: TripLocation[];
  personal_visibility?: VisibilityLevel | null;
  ownerProfile?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ParticipantData {
  id: string;
  user_id: string;
  status: ParticipationStatus;
  personal_visibility: VisibilityLevel | null;
  profile: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface RecommendationData {
  id: string;
  trip_id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: RecommendationCategory;
  location_id: string | null;
  created_at: string;
  profile: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CreateTripData {
  name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  visibility: VisibilityLevel;
  description?: string;
  invitees?: string[];
  city_id?: string;
  country_id?: string;
  trip_type_id?: string;
  is_flexible_dates?: boolean;
  flexible_month?: string;
  is_logged_past_trip?: boolean;
}

const sortLocationsByDate = (locations: TripLocation[]): TripLocation[] => {
  return [...locations].sort((a, b) => {
    if (!a.start_date && !b.start_date) return a.order_index - b.order_index;
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    
    const dateA = new Date(a.start_date).getTime();
    const dateB = new Date(b.start_date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    
    if (a.end_date && b.end_date) {
      return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    }
    
    return a.order_index - b.order_index;
  });
};

async function fetchTripsData(userId: string): Promise<TripData[]> {
  // Fetch trips where user is owner
  const { data: ownedTrips, error: ownedError } = await supabase
    .from('trips')
    .select('*')
    .eq('owner_id', userId)
    .order('start_date', { ascending: true });

  // Fetch trips where user is participant
  const { data: participations, error: partError } = await supabase
    .from('trip_participants')
    .select(`
      status,
      trip_id,
      trips (*)
    `)
    .eq('user_id', userId);

  if (ownedError || partError) {
    console.error('Error fetching trips:', ownedError || partError);
    return [];
  }

  // Combine and dedupe trips
  const tripsMap = new Map<string, TripData>();

  // Add owned trips
  (ownedTrips || []).forEach((trip) => {
    tripsMap.set(trip.id, {
      ...trip,
      isOwner: true,
      status: 'owner' as const,
      participants: [],
      is_flexible_dates: trip.is_flexible_dates,
      flexible_month: trip.flexible_month,
      is_logged_past_trip: trip.is_logged_past_trip || false,
      locations: [],
    });
  });

  // Add participated trips
  (participations || []).forEach((p) => {
    const trip = p.trips as any;
    if (trip && !tripsMap.has(trip.id)) {
      tripsMap.set(trip.id, {
        ...trip,
        isOwner: false,
        status: p.status,
        participants: [],
        is_flexible_dates: trip.is_flexible_dates,
        flexible_month: trip.flexible_month,
        is_logged_past_trip: trip.is_logged_past_trip || false,
        locations: [],
      });
    }
  });

  // Fetch participants and locations for all trips
  const tripIds = Array.from(tripsMap.keys());
  if (tripIds.length > 0) {
    // Fetch participants
    const { data: allParticipants } = await supabase
      .from('trip_participants')
      .select('id, trip_id, user_id, status, personal_visibility')
      .in('trip_id', tripIds);

    // Fetch locations
    const { data: allLocations } = await supabase
      .from('trip_locations')
      .select('*')
      .in('trip_id', tripIds)
      .order('order_index', { ascending: true });

    // Collect unique user IDs for profile fetch - include BOTH participants AND owners
    const participantUserIds = (allParticipants || []).map(p => p.user_id);
    const ownerIds = Array.from(tripsMap.values()).map(t => t.owner_id);
    const userIds = [...new Set([...participantUserIds, ...ownerIds])];
    let profilesMap: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);
      
      (profiles || []).forEach(p => {
        profilesMap[p.id] = p;
      });
    }

    // Assign owner profiles to trips
    tripsMap.forEach((trip) => {
      trip.ownerProfile = profilesMap[trip.owner_id] || null;
    });

    // Assign participants to trips and track current user's personal_visibility
    (allParticipants || []).forEach((participant) => {
      const trip = tripsMap.get(participant.trip_id);
      if (trip) {
        trip.participants.push({
          id: participant.id,
          user_id: participant.user_id,
          status: participant.status,
          personal_visibility: participant.personal_visibility,
          profile: profilesMap[participant.user_id] || null,
        });
        // If this participant is the current user, store their personal_visibility on the trip
        if (participant.user_id === userId) {
          trip.personal_visibility = participant.personal_visibility;
        }
      }
    });

    // Assign locations to trips
    (allLocations || []).forEach((location) => {
      const trip = tripsMap.get(location.trip_id);
      if (trip) {
        trip.locations = trip.locations || [];
        trip.locations.push(location);
      }
    });

    // Sort locations chronologically
    tripsMap.forEach((trip) => {
      if (trip.locations && trip.locations.length > 0) {
        trip.locations = sortLocationsByDate(trip.locations);
      }
    });
  }

  return Array.from(tripsMap.values()).sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
}

export function useTrips() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: trips = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: () => fetchTripsData(user!.id),
    enabled: !!user,
  });

  const createTripMutation = useMutation({
    mutationFn: async (data: CreateTripData) => {
      if (!user) throw new Error('Not authenticated');

      const { data: newTrip, error } = await supabase
        .from('trips')
        .insert({
          owner_id: user.id,
          name: data.name,
          destination: data.destination,
          start_date: data.start_date,
          end_date: data.end_date,
          visibility: data.visibility,
          description: data.description || null,
          city_id: data.city_id || null,
          trip_type_id: data.trip_type_id || null,
          is_flexible_dates: data.is_flexible_dates || false,
          flexible_month: data.flexible_month || null,
          is_logged_past_trip: data.is_logged_past_trip || false,
        })
        .select()
        .single();

      if (error) throw error;

      // Invite participants
      if (data.invitees && data.invitees.length > 0) {
        await supabase
          .from('trip_participants')
          .insert(
            data.invitees.map((userId) => ({
              trip_id: newTrip.id,
              user_id: userId,
              status: 'invited' as const,
            }))
          );
      }

      return newTrip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: Partial<CreateTripData> & { is_flexible_dates?: boolean; flexible_month?: string | null } }) => {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.destination !== undefined) updateData.destination = data.destination;
      if (data.start_date !== undefined) updateData.start_date = data.start_date;
      if (data.end_date !== undefined) updateData.end_date = data.end_date;
      if (data.visibility !== undefined) updateData.visibility = data.visibility;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.is_flexible_dates !== undefined) updateData.is_flexible_dates = data.is_flexible_dates;
      if (data.flexible_month !== undefined) updateData.flexible_month = data.flexible_month;

      const { error } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', tripId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripDetail'] });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const inviteToTripMutation = useMutation({
    mutationFn: async ({ tripId, userId }: { tripId: string; userId: string }) => {
      const { error } = await supabase
        .from('trip_participants')
        .insert({
          trip_id: tripId,
          user_id: userId,
          status: 'invited',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripDetail'] });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (participantId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get participant info first to clean up related records
      const { data: participant } = await supabase
        .from('trip_participants')
        .select('user_id, trip_id')
        .eq('id', participantId)
        .single();
      
      if (participant) {
        // Get location IDs for this trip
        const { data: locations } = await supabase
          .from('trip_locations')
          .select('id')
          .eq('trip_id', participant.trip_id);
        
        const locationIds = locations?.map(l => l.id) || [];
        
        // Delete location_participants for this user
        if (locationIds.length > 0) {
          await supabase
            .from('location_participants')
            .delete()
            .eq('user_id', participant.user_id)
            .in('location_id', locationIds);
        }
        
        // Get resource IDs for this trip
        const { data: resources } = await supabase
          .from('trip_resources')
          .select('id')
          .eq('trip_id', participant.trip_id);
        
        const resourceIds = resources?.map(r => r.id) || [];
        
        // Delete resource_participants for this user
        if (resourceIds.length > 0) {
          await supabase
            .from('resource_participants')
            .delete()
            .eq('user_id', participant.user_id)
            .in('resource_id', resourceIds);
        }
      }
      
      // Delete the participant record
      const { error } = await supabase
        .from('trip_participants')
        .delete()
        .eq('id', participantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripDetail'] });
    },
  });

  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ tripId, response }: { tripId: string; response: 'confirmed' | 'declined' | 'tentative' }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('trip_participants')
        .update({
          status: response as ParticipationStatus,
          responded_at: new Date().toISOString(),
        })
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripDetail'] });
    },
  });

  const requestToJoinMutation = useMutation({
    mutationFn: async (tripId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('trip_participants')
        .insert({
          trip_id: tripId,
          user_id: user.id,
          status: 'pending' as ParticipationStatus,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripDetail'] });
    },
  });

  const respondToJoinRequestMutation = useMutation({
    mutationFn: async ({ participantId, accept }: { participantId: string; accept: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (accept) {
        const { error } = await supabase
          .from('trip_participants')
          .update({
            status: 'confirmed' as ParticipationStatus,
            responded_at: new Date().toISOString(),
          })
          .eq('id', participantId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trip_participants')
          .delete()
          .eq('id', participantId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripDetail'] });
      queryClient.invalidateQueries({ queryKey: ['tripParticipants'] });
    },
  });

  const updatePersonalVisibilityMutation = useMutation({
    mutationFn: async ({ tripId, visibility }: { tripId: string; visibility: VisibilityLevel | null }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('trip_participants')
        .update({ personal_visibility: visibility })
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripDetail'] });
    },
  });

  const createTrip = async (data: CreateTripData) => {
    try {
      const result = await createTripMutation.mutateAsync(data);
      return { data: result, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const updateTrip = async (tripId: string, data: Partial<CreateTripData> & { is_flexible_dates?: boolean; flexible_month?: string | null }) => {
    try {
      await updateTripMutation.mutateAsync({ tripId, data });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      await deleteTripMutation.mutateAsync(tripId);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const inviteToTrip = async (tripId: string, userId: string) => {
    try {
      await inviteToTripMutation.mutateAsync({ tripId, userId });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const cancelInvite = async (participantId: string) => {
    await cancelInviteMutation.mutateAsync(participantId);
  };

  const removeParticipant = async (participantId: string) => {
    await cancelInvite(participantId);
  };

  const respondToInvitation = async (tripId: string, response: 'confirmed' | 'declined' | 'tentative') => {
    try {
      await respondToInvitationMutation.mutateAsync({ tripId, response });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const requestToJoin = async (tripId: string) => {
    try {
      await requestToJoinMutation.mutateAsync(tripId);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const respondToJoinRequest = async (participantId: string, accept: boolean) => {
    try {
      await respondToJoinRequestMutation.mutateAsync({ participantId, accept });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const updatePersonalVisibility = async (tripId: string, visibility: VisibilityLevel | null) => {
    try {
      await updatePersonalVisibilityMutation.mutateAsync({ tripId, visibility });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return {
    trips,
    loading,
    fetchTrips: refetch,
    createTrip,
    updateTrip,
    deleteTrip,
    inviteToTrip,
    cancelInvite,
    removeParticipant,
    respondToInvitation,
    requestToJoin,
    respondToJoinRequest,
    updatePersonalVisibility,
  };
}

async function fetchTripDetailData(tripId: string, userId: string): Promise<{ trip: TripData | null; recommendations: RecommendationData[] }> {
  const { data: tripData, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .maybeSingle();

  if (error || !tripData) {
    console.error('Error fetching trip:', error);
    return { trip: null, recommendations: [] };
  }

  // Get participation status
  const { data: participation } = await supabase
    .from('trip_participants')
    .select('status')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  // Get all participants (without join)
  const { data: participantsData } = await supabase
    .from('trip_participants')
    .select('id, user_id, status, personal_visibility')
    .eq('trip_id', tripId);

  // Fetch profiles for participants
  const participantUserIds = (participantsData || []).map(p => p.user_id);
  let participantProfiles: Record<string, any> = {};
  
  if (participantUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', participantUserIds);
    
    (profiles || []).forEach(p => {
      participantProfiles[p.id] = p;
    });
  }

  // Fetch owner profile
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', tripData.owner_id)
    .single();

  const trip: TripData = {
    ...tripData,
    isOwner: tripData.owner_id === userId,
    status: tripData.owner_id === userId ? 'owner' : (participation?.status || 'invited'),
    participants: (participantsData || []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      status: p.status,
      personal_visibility: p.personal_visibility,
      profile: participantProfiles[p.user_id] || null,
    })),
    ownerProfile: ownerProfile,
    is_flexible_dates: tripData.is_flexible_dates,
    flexible_month: tripData.flexible_month,
  };

  // Fetch recommendations (now including location_id)
  const { data: recsData } = await supabase
    .from('trip_recommendations')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  // Fetch profiles for recommendations
  const recUserIds = [...new Set((recsData || []).map(r => r.user_id))];
  let recProfiles: Record<string, any> = {};
  
  if (recUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, id')
      .in('id', recUserIds);
    
    (profiles || []).forEach(p => {
      recProfiles[p.id] = p;
    });
  }

  const recommendations: RecommendationData[] = (recsData || []).map((r) => ({
    ...r,
    location_id: r.location_id || null,
    profile: recProfiles[r.user_id] || null,
  }));

  return { trip, recommendations };
}

export function useTripDetail(tripId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['tripDetail', tripId, user?.id],
    queryFn: () => fetchTripDetailData(tripId, user!.id),
    enabled: !!user && !!tripId,
  });

  const trip = data?.trip ?? null;
  const recommendations = data?.recommendations ?? [];

  const { addRecommendation } = useAddTripRecommendation(tripId);

  const deleteRecommendationMutation = useMutation({
    mutationFn: async (recId: string) => {
      const { error } = await supabase
        .from('trip_recommendations')
        .delete()
        .eq('id', recId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripDetail', tripId] });
    },
  });

  const deleteRecommendation = async (recId: string) => {
    try {
      await deleteRecommendationMutation.mutateAsync(recId);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return {
    trip,
    recommendations,
    loading,
    fetchTripDetail: refetch,
    addRecommendation,
    deleteRecommendation,
  };
}

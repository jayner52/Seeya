import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TripParticipantProfile {
  id: string;
  user_id: string;
  status: string;
  profile: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useTripParticipants(tripId: string | undefined) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<TripParticipantProfile[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<TripParticipantProfile['profile'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!tripId || !user) {
        setParticipants([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch trip to get owner
        const { data: trip } = await supabase
          .from('trips')
          .select('owner_id')
          .eq('id', tripId)
          .single();

        if (trip) {
          // Fetch owner profile
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', trip.owner_id)
            .single();
          
          setOwnerProfile(ownerData);
        }

        // Fetch participants (including pending join requests)
        const { data: participantsData, error } = await supabase
          .from('trip_participants')
          .select('id, user_id, status')
          .eq('trip_id', tripId)
          .in('status', ['confirmed', 'invited', 'pending']);

        if (error) throw error;

        // Fetch profiles
        const userIds = participantsData?.map(p => p.user_id) || [];
        const { data: profiles } = userIds.length > 0 
          ? await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .in('id', userIds)
          : { data: [] };

        const profileMap = new Map<string, TripParticipantProfile['profile']>();
        profiles?.forEach(p => profileMap.set(p.id, p));

        setParticipants(participantsData?.map(p => ({
          id: p.id,
          user_id: p.user_id,
          status: p.status,
          profile: profileMap.get(p.user_id) || null,
        })) || []);
      } catch (error) {
        console.error('Error fetching trip participants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [tripId, user]);

  // Get all users (owner + confirmed participants)
  const allTravelers = [
    ...(ownerProfile ? [{
      id: 'owner',
      user_id: ownerProfile.id,
      status: 'owner',
      profile: ownerProfile,
    }] : []),
    ...participants.filter(p => p.status === 'confirmed'),
  ];

  // Get pending join requests
  const pendingRequests = participants.filter(p => p.status === 'pending');

  return {
    participants,
    ownerProfile,
    allTravelers,
    pendingRequests,
    loading,
  };
}

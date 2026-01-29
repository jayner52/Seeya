import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LocationParticipant {
  id: string;
  location_id: string;
  user_id: string;
  created_at: string;
  profile?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useLocationParticipants(tripId: string) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Record<string, LocationParticipant[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchParticipants = async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }

    // Get all location IDs for this trip first
    const { data: locations } = await supabase
      .from('trip_locations')
      .select('id')
      .eq('trip_id', tripId);

    if (!locations || locations.length === 0) {
      setParticipants({});
      setLoading(false);
      return;
    }

    const locationIds = locations.map(l => l.id);

    const { data, error } = await supabase
      .from('location_participants')
      .select(`
        id,
        location_id,
        user_id,
        created_at
      `)
      .in('location_id', locationIds);

    if (error) {
      console.error('Error fetching location participants:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for all participants
    const userIds = [...new Set(data?.map(p => p.user_id) || [])];
    let profiles: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);
      
      profiles = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);
    }

    // Group by location_id
    const grouped = (data || []).reduce((acc, p) => {
      if (!acc[p.location_id]) acc[p.location_id] = [];
      acc[p.location_id].push({
        ...p,
        profile: profiles[p.user_id],
      });
      return acc;
    }, {} as Record<string, LocationParticipant[]>);

    setParticipants(grouped);
    setLoading(false);
  };

  useEffect(() => {
    fetchParticipants();
  }, [tripId]);

  // Realtime subscription
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`location_participants_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_participants',
        },
        () => fetchParticipants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const addParticipant = async (locationId: string, userId: string) => {
    const { error } = await supabase
      .from('location_participants')
      .insert({ location_id: locationId, user_id: userId });

    if (!error) await fetchParticipants();
    return { error };
  };

  const removeParticipant = async (locationId: string, userId: string) => {
    const { error } = await supabase
      .from('location_participants')
      .delete()
      .eq('location_id', locationId)
      .eq('user_id', userId);

    if (!error) await fetchParticipants();
    return { error };
  };

  const toggleParticipant = async (locationId: string, userId: string) => {
    const locationParticipants = participants[locationId] || [];
    const isParticipant = locationParticipants.some(p => p.user_id === userId);
    
    if (isParticipant) {
      return removeParticipant(locationId, userId);
    } else {
      return addParticipant(locationId, userId);
    }
  };

  const getLocationParticipants = (locationId: string): LocationParticipant[] => {
    return participants[locationId] || [];
  };

  return {
    participants,
    loading,
    fetchParticipants,
    addParticipant,
    removeParticipant,
    toggleParticipant,
    getLocationParticipants,
  };
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TripInvite {
  id: string;
  trip_id: string;
  token: string;
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
  included_location_ids: string[] | null;
  included_tripbit_ids: string[] | null;
}

export function useTripInvites(tripId: string) {
  const { user } = useAuth();
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    if (!tripId || !user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('trip_invites')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
    } else {
      setInvites(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvites();
  }, [tripId, user]);

  // Generate a short, friendly invite code (8 characters)
  const generateShortToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const createInviteLink = async (options?: {
    expires_in_days?: number;
    expires_at?: Date | null;
    max_uses?: number;
    locationIds?: string[];
    tripbitIds?: string[];
  }) => {
    if (!user) return { error: { message: 'Not authenticated' }, data: null };

    let expires_at: string | null = null;
    if (options?.expires_at) {
      expires_at = options.expires_at.toISOString();
    } else if (options?.expires_in_days) {
      expires_at = new Date(Date.now() + options.expires_in_days * 24 * 60 * 60 * 1000).toISOString();
    }

    // Generate a short token and check for collisions
    let shortToken = generateShortToken();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('trip_invites')
        .select('id')
        .eq('token', shortToken)
        .maybeSingle();
      
      if (!existing) break;
      shortToken = generateShortToken();
      attempts++;
    }

    const { data, error } = await supabase
      .from('trip_invites')
      .insert({
        trip_id: tripId,
        created_by: user.id,
        expires_at,
        max_uses: options?.max_uses || null,
        token: shortToken,
        included_location_ids: options?.locationIds || null,
        included_tripbit_ids: options?.tripbitIds || null,
      })
      .select()
      .single();

    if (!error) await fetchInvites();
    return { data, error };
  };

  const deleteInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('trip_invites')
      .delete()
      .eq('id', inviteId);

    if (!error) await fetchInvites();
    return { error };
  };

  const getInviteUrl = (token: string) => {
    return `${window.location.origin}/invite/${token}`;
  };

  return {
    invites,
    loading,
    fetchInvites,
    createInviteLink,
    deleteInvite,
    getInviteUrl,
  };
}

export async function acceptTripInvite(token: string) {
  const { data, error } = await supabase.rpc('accept_trip_invite', {
    _token: token,
  });

  return { tripId: data, error };
}

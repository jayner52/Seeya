import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface WanderlistItem {
  id: string;
  name: string;
  google_place_id: string | null;
  city_id: string | null;
  country_id: string | null;
  created_at: string;
  type: 'country' | 'city' | 'place';
  country_emoji?: string | null;
  continent?: string | null;
  country_name?: string | null;
}

export interface WanderlistCountry {
  id: string;
  name: string;
  country_id: string;
  country_emoji: string | null;
  continent: string | null;
  cities: WanderlistCity[];
}

export interface WanderlistCity {
  id: string;
  name: string;
  city_id: string | null;
  google_place_id: string | null;
}

export interface TrendingWanderlistItem {
  name: string;
  google_place_id: string | null;
  city_id: string | null;
  country_id: string | null;
  friend_count: number;
  country_emoji: string | null;
}

// Helper to determine item type
function getItemType(item: { country_id: string | null; city_id: string | null; google_place_id: string | null }): 'country' | 'city' | 'place' {
  if (item.country_id && !item.city_id && !item.google_place_id) {
    return 'country';
  }
  if (item.city_id) {
    return 'city';
  }
  return 'place';
}

export function useWanderlist(userId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<WanderlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const targetUserId = userId || user?.id;

  const fetchWanderlist = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Fetch wanderlist items with country emoji and continent
    const { data, error } = await supabase
      .from('wanderlist')
      .select(`
        *,
        country:countries!wanderlist_country_id_fkey(emoji, continent, name),
        city:cities!wanderlist_city_id_fkey(
          name,
          country:countries!cities_country_id_fkey(id, emoji, continent, name)
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wanderlist:', error);
      setItems([]);
    } else {
      const transformedItems: WanderlistItem[] = (data || []).map((item: any) => {
        // Get country data from direct country relation or via city's country
        const countryData = item.country || item.city?.country;
        return {
          id: item.id,
          name: item.name,
          google_place_id: item.google_place_id,
          city_id: item.city_id,
          country_id: item.country_id || item.city?.country?.id || null,
          created_at: item.created_at,
          type: getItemType(item),
          country_emoji: countryData?.emoji || null,
          continent: countryData?.continent || null,
          country_name: countryData?.name || null,
        };
      });
      setItems(transformedItems);
    }
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    fetchWanderlist();
  }, [fetchWanderlist]);

  // Get countries grouped with their cities
  const getGroupedByCountry = useCallback((): WanderlistCountry[] => {
    const countryMap = new Map<string, WanderlistCountry>();
    
    // First pass: add all countries
    items.filter(item => item.type === 'country').forEach(item => {
      if (item.country_id) {
        countryMap.set(item.country_id, {
          id: item.id,
          name: item.name,
          country_id: item.country_id,
          country_emoji: item.country_emoji,
          continent: item.continent,
          cities: [],
        });
      }
    });
    
    // Second pass: add cities to their countries
    items.filter(item => item.type === 'city' || item.type === 'place').forEach(item => {
      const countryId = item.country_id;
      if (countryId && countryMap.has(countryId)) {
        countryMap.get(countryId)!.cities.push({
          id: item.id,
          name: item.name,
          city_id: item.city_id,
          google_place_id: item.google_place_id,
        });
      }
      // Note: orphan cities without a parent country in wanderlist are not displayed
      // This encourages users to add the country first
    });
    
    return Array.from(countryMap.values());
  }, [items]);

  const addToWanderlist = async (item: {
    name: string;
    google_place_id?: string;
    city_id?: string;
    country_id?: string;
    country_emoji?: string;
    continent?: string;
    country_name?: string;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('wanderlist')
      .insert({
        user_id: user.id,
        name: item.name,
        google_place_id: item.google_place_id || null,
        city_id: item.city_id || null,
        country_id: item.country_id || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already on your Wanderlist', description: `${item.name} is already saved` });
      } else {
        toast({ title: 'Error', description: 'Failed to add destination', variant: 'destructive' });
      }
      return { error };
    }

    const newItem: WanderlistItem = {
      ...data,
      type: getItemType(data),
      country_emoji: item.country_emoji || null,
      continent: item.continent || null,
      country_name: item.country_name || null,
    };
    setItems(prev => [newItem, ...prev]);
    return { data: newItem };
  };

  // Add a city to a specific country (country must already be in wanderlist)
  const addCityToCountry = async (city: {
    name: string;
    city_id?: string;
    google_place_id?: string;
    country_id: string;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Check if the parent country exists in wanderlist
    const parentCountry = items.find(
      item => item.type === 'country' && item.country_id === city.country_id
    );
    
    if (!parentCountry) {
      toast({ 
        title: 'Add country first', 
        description: 'Please add the country to your Wanderlist before adding cities',
        variant: 'destructive'
      });
      return { error: new Error('Parent country not in wanderlist') };
    }

    const { data, error } = await supabase
      .from('wanderlist')
      .insert({
        user_id: user.id,
        name: city.name,
        google_place_id: city.google_place_id || null,
        city_id: city.city_id || null,
        country_id: null, // Cities don't have country_id directly, they inherit from city record
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already on your Wanderlist', description: `${city.name} is already saved` });
      } else {
        toast({ title: 'Error', description: 'Failed to add city', variant: 'destructive' });
      }
      return { error };
    }

    const newItem: WanderlistItem = {
      ...data,
      type: 'city',
      country_emoji: parentCountry.country_emoji,
      continent: parentCountry.continent,
      country_name: parentCountry.name,
      country_id: city.country_id,
    };
    setItems(prev => [newItem, ...prev]);
    toast({ title: 'City added', description: `${city.name} added to ${parentCountry.name}` });
    return { data: newItem };
  };

  const removeFromWanderlist = async (id: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('wanderlist')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to remove destination', variant: 'destructive' });
      return { error };
    }

    setItems(prev => prev.filter(item => item.id !== id));
    return { success: true };
  };

  return {
    items,
    loading,
    addToWanderlist,
    addCityToCountry,
    removeFromWanderlist,
    getGroupedByCountry,
    refresh: fetchWanderlist,
  };
}

export function useTrendingWanderlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<TrendingWanderlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTrending = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_trending_wanderlist', {
        _user_id: user.id,
      });

      if (error) {
        console.error('Error fetching trending wanderlist:', error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };

    fetchTrending();
  }, [user]);

  return { items, loading };
}

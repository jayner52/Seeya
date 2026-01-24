import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FriendRecommendation {
  id: string;
  user_id: string;
  city_id: string | null;
  country_id: string | null;
  title: string;
  description: string | null;
  category: 'restaurant' | 'activity' | 'stay' | 'tip';
  rating: number | null;
  tips: string | null;
  url: string | null;
  google_place_id: string | null;
  source_resource_id: string | null;
  source_trip_id: string | null;
  created_at: string;
  profile: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  city: {
    id: string;
    name: string;
    region: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  country: {
    id: string;
    name: string;
    emoji: string;
  } | null;
}

interface FetchOptions {
  cityIds?: string[];
  countryIds?: string[];
}

export function useFriendRecommendations(options: FetchOptions) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<FriendRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { cityIds = [], countryIds = [] } = options;

  const fetchRecommendations = useCallback(async () => {
    if (!user || (cityIds.length === 0 && countryIds.length === 0)) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query to match by city_id OR country_id
      let query = supabase
        .from('shared_recommendations')
        .select(`
          *,
          profile:profiles!shared_recommendations_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          city:cities (
            id,
            name,
            region
          ),
          country:countries (
            id,
            name,
            emoji
          )
        `)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Match by city_id OR country_id
      if (cityIds.length > 0 && countryIds.length > 0) {
        query = query.or(`city_id.in.(${cityIds.join(',')}),country_id.in.(${countryIds.join(',')})`);
      } else if (cityIds.length > 0) {
        query = query.in('city_id', cityIds);
      } else if (countryIds.length > 0) {
        query = query.in('country_id', countryIds);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setRecommendations((data || []) as unknown as FriendRecommendation[]);
    } catch (err: any) {
      console.error('Error fetching friend recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, cityIds, countryIds]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refetch: fetchRecommendations,
  };
}

export function useShareRecommendation() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const shareRecommendation = async (data: {
    cityId?: string;
    countryId?: string;
    cityName?: string; // For auto-creating cities
    title: string;
    description?: string;
    category: 'restaurant' | 'activity' | 'stay' | 'tip';
    rating: number;
    tips?: string;
    url?: string;
    googlePlaceId?: string;
    sourceResourceId?: string;
    sourceTripId?: string;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };
    // Require at least one location identifier
    if (!data.cityId && !data.countryId && !data.googlePlaceId) {
      return { error: new Error('Either cityId, countryId, or googlePlaceId is required') };
    }

    setLoading(true);

    try {
      let finalCityId = data.cityId || null;
      
      // If we have a country but no city, and we have a city name, auto-create the city
      if (!finalCityId && data.countryId && data.cityName) {
        // First check if city exists
        const { data: existingCity } = await supabase
          .from('cities')
          .select('id')
          .eq('country_id', data.countryId)
          .ilike('name', data.cityName)
          .limit(1)
          .maybeSingle();
        
        if (existingCity) {
          finalCityId = existingCity.id;
        } else {
          // Create the city
          const { data: newCity, error: cityError } = await supabase
            .from('cities')
            .insert({
              name: data.cityName,
              country_id: data.countryId,
              google_place_id: data.googlePlaceId || null,
            })
            .select('id')
            .single();
          
          if (newCity && !cityError) {
            finalCityId = newCity.id;
            console.log('[ShareRecommendation] Created new city:', data.cityName, newCity.id);
          }
        }
      }

      const { error } = await supabase
        .from('shared_recommendations')
        .insert({
          user_id: user.id,
          city_id: finalCityId,
          country_id: data.countryId || null,
          title: data.title,
          description: data.description || null,
          category: data.category,
          rating: data.rating,
          tips: data.tips || null,
          url: data.url || null,
          google_place_id: data.googlePlaceId || null,
          source_resource_id: data.sourceResourceId || null,
          source_trip_id: data.sourceTripId || null,
        });

      if (error) throw error;

      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const checkIfShared = async (resourceId: string): Promise<boolean> => {
    if (!user) return false;

    const { data } = await supabase
      .from('shared_recommendations')
      .select('id')
      .eq('source_resource_id', resourceId)
      .eq('user_id', user.id)
      .maybeSingle();

    return !!data;
  };

  return {
    shareRecommendation,
    checkIfShared,
    loading,
  };
}

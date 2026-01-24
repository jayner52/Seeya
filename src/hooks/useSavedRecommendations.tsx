import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { FriendRecommendation } from './useFriendRecommendations';

export interface SavedRecommendation {
  id: string;
  shared_recommendation_id: string;
  created_at: string;
  recommendation: FriendRecommendation;
}

export interface GroupedSavedRecommendations {
  [countryId: string]: {
    country: { id: string; name: string; emoji: string };
    cities: {
      [cityId: string]: {
        city: { id: string; name: string };
        recommendations: SavedRecommendation[];
      };
    };
    countryWide: SavedRecommendation[];
  };
}

async function fetchSavedRecommendations(userId: string): Promise<SavedRecommendation[]> {
  const { data, error } = await supabase
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
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching saved recommendations:', error);
    return [];
  }

  return data.map((item: any) => {
    const sr = item.shared_recommendations;
    return {
      id: item.id,
      shared_recommendation_id: item.shared_recommendation_id,
      created_at: item.created_at,
      recommendation: {
        id: sr.id,
        user_id: sr.user_id,
        city_id: sr.city_id,
        country_id: sr.country_id,
        title: sr.title,
        description: sr.description,
        category: sr.category,
        rating: sr.rating,
        tips: sr.tips,
        url: sr.url,
        google_place_id: sr.google_place_id,
        source_resource_id: null,
        source_trip_id: null,
        created_at: sr.created_at,
        profile: sr.profiles || { id: '', username: 'Unknown', full_name: null, avatar_url: null },
        city: sr.city,
        country: sr.country,
      } as FriendRecommendation,
    };
  });
}

function groupByLocation(items: SavedRecommendation[]): GroupedSavedRecommendations {
  const grouped: GroupedSavedRecommendations = {};

  items.forEach((item) => {
    const rec = item.recommendation;
    if (!rec.country) return;

    const countryId = rec.country.id;

    if (!grouped[countryId]) {
      grouped[countryId] = {
        country: rec.country,
        cities: {},
        countryWide: [],
      };
    }

    if (rec.city) {
      const cityId = rec.city.id;
      if (!grouped[countryId].cities[cityId]) {
        grouped[countryId].cities[cityId] = {
          city: { id: rec.city.id, name: rec.city.name },
          recommendations: [],
        };
      }
      grouped[countryId].cities[cityId].recommendations.push(item);
    } else {
      grouped[countryId].countryWide.push(item);
    }
  });

  return grouped;
}

export function useSavedRecommendations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedItems = [], isLoading: loading } = useQuery({
    queryKey: ['saved-recommendations', user?.id],
    queryFn: () => fetchSavedRecommendations(user!.id),
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (sharedRecommendationId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('saved_recommendations')
        .insert({
          user_id: user.id,
          shared_recommendation_id: sharedRecommendationId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-recommendations', user?.id] });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async (sharedRecommendationId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('saved_recommendations')
        .delete()
        .eq('user_id', user.id)
        .eq('shared_recommendation_id', sharedRecommendationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-recommendations', user?.id] });
    },
  });

  const isSaved = (sharedRecommendationId: string): boolean => {
    return savedItems.some((item) => item.shared_recommendation_id === sharedRecommendationId);
  };

  const grouped = groupByLocation(savedItems);

  return {
    savedItems,
    grouped,
    loading,
    saveRecommendation: saveMutation.mutateAsync,
    unsaveRecommendation: unsaveMutation.mutateAsync,
    isSaved,
    isSaving: saveMutation.isPending,
    isUnsaving: unsaveMutation.isPending,
  };
}

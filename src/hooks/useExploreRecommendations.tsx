import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FriendRecommendation } from '@/hooks/useFriendRecommendations';

async function fetchExploreRecommendations(userId: string): Promise<FriendRecommendation[]> {
  const { data, error } = await supabase
    .from('shared_recommendations')
    .select(`
      id,
      user_id,
      city_id,
      country_id,
      title,
      description,
      category,
      rating,
      url,
      tips,
      google_place_id,
      source_resource_id,
      source_trip_id,
      created_at,
      profiles!shared_recommendations_user_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      ),
      cities!shared_recommendations_city_id_fkey (
        id,
        name,
        region,
        latitude,
        longitude
      ),
      countries!shared_recommendations_country_id_fkey (
        id,
        name,
        emoji
      )
    `)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching explore recommendations:', error);
    return [];
  }

  return (data || []).map((rec: any) => ({
    id: rec.id,
    user_id: rec.user_id,
    city_id: rec.city_id,
    country_id: rec.country_id,
    title: rec.title,
    description: rec.description,
    category: rec.category,
    rating: rec.rating,
    url: rec.url,
    tips: rec.tips,
    google_place_id: rec.google_place_id,
    source_resource_id: rec.source_resource_id,
    source_trip_id: rec.source_trip_id,
    created_at: rec.created_at,
    profile: rec.profiles ? {
      id: rec.profiles.id,
      username: rec.profiles.username,
      full_name: rec.profiles.full_name,
      avatar_url: rec.profiles.avatar_url,
    } : { id: '', username: 'Unknown', full_name: null, avatar_url: null },
    city: rec.cities ? {
      id: rec.cities.id,
      name: rec.cities.name,
      region: rec.cities.region,
      latitude: rec.cities.latitude,
      longitude: rec.cities.longitude,
    } : null,
    country: rec.countries ? {
      id: rec.countries.id,
      name: rec.countries.name,
      emoji: rec.countries.emoji,
    } : null,
  }));
}

export function useExploreRecommendations() {
  const { user } = useAuth();

  const { data: recommendations = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['explore-recommendations', user?.id],
    queryFn: () => fetchExploreRecommendations(user!.id),
    enabled: !!user,
  });

  return {
    recommendations,
    loading,
    refresh: refetch,
  };
}

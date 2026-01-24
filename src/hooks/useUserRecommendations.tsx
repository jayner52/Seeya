import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserRecommendation {
  id: string;
  title: string;
  description: string | null;
  category: string;
  rating: number | null;
  tips: string | null;
  url: string | null;
  created_at: string;
  city: {
    id: string;
    name: string;
  } | null;
  country: {
    id: string;
    name: string;
    emoji: string;
  };
}

export interface GroupedRecommendations {
  [countryId: string]: {
    country: { id: string; name: string; emoji: string };
    cities: {
      [cityId: string]: {
        city: { id: string; name: string };
        recommendations: UserRecommendation[];
      };
    };
    countryWide: UserRecommendation[]; // For country-only recommendations
  };
}

async function fetchUserRecommendations(userId: string): Promise<{ recommendations: UserRecommendation[]; grouped: GroupedRecommendations }> {
  const { data, error } = await supabase
    .from('shared_recommendations')
    .select(`
      id,
      title,
      description,
      category,
      rating,
      tips,
      url,
      created_at,
      city_id,
      country_id,
      cities(
        id,
        name,
        countries(id, name, emoji)
      ),
      countries(id, name, emoji)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return { recommendations: [], grouped: {} };
  }

  const formatted: UserRecommendation[] = data.map((rec: any) => {
    // Determine country from city or direct country reference
    const country = rec.cities?.countries || rec.countries;
    
    return {
      id: rec.id,
      title: rec.title,
      description: rec.description,
      category: rec.category,
      rating: rec.rating,
      tips: rec.tips,
      url: rec.url,
      created_at: rec.created_at,
      city: rec.cities ? {
        id: rec.cities.id,
        name: rec.cities.name,
      } : null,
      country: country,
    };
  });

  // Group by country -> city (or country-wide)
  const groupedData: GroupedRecommendations = {};
  formatted.forEach((rec) => {
    if (!rec.country) return;
    
    const countryId = rec.country.id;

    if (!groupedData[countryId]) {
      groupedData[countryId] = {
        country: rec.country,
        cities: {},
        countryWide: [],
      };
    }

    if (rec.city) {
      const cityId = rec.city.id;
      if (!groupedData[countryId].cities[cityId]) {
        groupedData[countryId].cities[cityId] = {
          city: { id: rec.city.id, name: rec.city.name },
          recommendations: [],
        };
      }
      groupedData[countryId].cities[cityId].recommendations.push(rec);
    } else {
      // Country-wide recommendation
      groupedData[countryId].countryWide.push(rec);
    }
  });

  return { recommendations: formatted, grouped: groupedData };
}

export function useUserRecommendations(userId: string | undefined) {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['user-recommendations', userId],
    queryFn: () => fetchUserRecommendations(userId!),
    enabled: !!userId,
  });

  return { 
    recommendations: data?.recommendations ?? [], 
    grouped: data?.grouped ?? {}, 
    loading 
  };
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type RecommendationCategory = Database['public']['Enums']['recommendation_category'];

type AddRecommendationInput = {
  title: string;
  description?: string;
  category: RecommendationCategory;
  location_id?: string;
  google_place_id?: string;
  google_place_country_code?: string;
  google_place_country_name?: string;
  google_place_city_name?: string;
};

export function useAddTripRecommendation(tripId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (recData: AddRecommendationInput) => {
      if (!user) throw new Error('Not authenticated');

      // Insert into trip_recommendations
      const { error } = await supabase
        .from('trip_recommendations')
        .insert({
          trip_id: tripId,
          user_id: user.id,
          title: recData.title,
          description: recData.description || null,
          category: recData.category,
          location_id: recData.location_id || null,
        });

      if (error) throw error;

      // Also insert into shared_recommendations for profile/explore visibility
      // Get city_id and country_id from Google Places data, trip location, or trip destination
      let cityId: string | null = null;
      let countryId: string | null = null;
      let destinationToSearch: string | null = null;

      // Priority 1: Use Google Places data if available
      if (recData.google_place_country_code || recData.google_place_country_name) {
        // Look up country by code first, then by name
        const countryQuery = supabase.from('countries').select('id');
        if (recData.google_place_country_code) {
          countryQuery.eq('code', recData.google_place_country_code.toUpperCase());
        } else {
          countryQuery.ilike('name', recData.google_place_country_name!);
        }
        
        const { data: countryData } = await countryQuery.limit(1).maybeSingle();
        
        if (countryData) {
          countryId = countryData.id;
          console.log('[Recommendation] Found country from Google Places:', recData.google_place_country_name, countryData.id);
          
      // Look up city if we have a city name from Google Places
          if (recData.google_place_city_name) {
            const { data: cityData } = await supabase
              .from('cities')
              .select('id')
              .eq('country_id', countryId)
              .ilike('name', recData.google_place_city_name)
              .limit(1)
              .maybeSingle();
            
            if (cityData) {
              cityId = cityData.id;
              console.log('[Recommendation] Found city from Google Places:', recData.google_place_city_name, cityData.id);
            } else {
              // City doesn't exist - auto-create it from Google Places data
              console.log('[Recommendation] City not found in DB, creating:', recData.google_place_city_name);
              const { data: newCity, error: cityError } = await supabase
                .from('cities')
                .insert({
                  name: recData.google_place_city_name,
                  country_id: countryId,
                  google_place_id: recData.google_place_id || null,
                })
                .select('id')
                .single();
              
              if (newCity && !cityError) {
                cityId = newCity.id;
                console.log('[Recommendation] Created new city:', recData.google_place_city_name, newCity.id);
              } else {
                console.error('[Recommendation] Failed to create city:', cityError);
              }
            }
          }
        }
      }

      // Priority 2: Fall back to trip location data
      if (!countryId && recData.location_id) {
        const { data: locationData } = await supabase
          .from('trip_locations')
          .select('city_id, destination, cities(country_id)')
          .eq('id', recData.location_id)
          .single();

        if (locationData?.city_id) {
          cityId = locationData.city_id;
          countryId = (locationData.cities as any)?.country_id || null;
        } else if (locationData?.destination) {
          destinationToSearch = locationData.destination;
        }
      }

      // Priority 3: Fall back to trip's city_id or destination
      if (!cityId && !countryId && !destinationToSearch) {
        const { data: tripData } = await supabase
          .from('trips')
          .select('city_id, destination, cities(country_id)')
          .eq('id', tripId)
          .single();

        if (tripData?.city_id) {
          cityId = tripData.city_id;
          countryId = (tripData.cities as any)?.country_id || null;
        } else if (tripData?.destination) {
          destinationToSearch = tripData.destination;
        }
      }

      // If we still don't have city_id, try to look up by destination name
      if (!cityId && destinationToSearch) {
        // First, check if destination is a simple country name (no commas)
        if (!destinationToSearch.includes(',')) {
          const { data: countryData } = await supabase
            .from('countries')
            .select('id')
            .ilike('name', destinationToSearch.trim())
            .limit(1)
            .maybeSingle();

          if (countryData) {
            countryId = countryData.id;
            console.log('[Recommendation] Found country from simple destination:', destinationToSearch, countryData.id);
          }
        }

        // If not a country, try city lookup
        if (!countryId) {
          const cityName = destinationToSearch.split(',')[0].trim();

          const { data: cityData } = await supabase
            .from('cities')
            .select('id, country_id')
            .ilike('name', cityName)
            .limit(1)
            .maybeSingle();

          if (cityData) {
            cityId = cityData.id;
            countryId = cityData.country_id;
            console.log('[Recommendation] Found city:', cityName, cityData.id);
          } else {
            // Try country lookup from last part of destination
            const parts = destinationToSearch.split(',');
            const countryName = parts[parts.length - 1]?.trim();
            if (countryName) {
              const { data: countryData } = await supabase
                .from('countries')
                .select('id')
                .ilike('name', countryName)
                .limit(1)
                .maybeSingle();

              if (countryData) {
                countryId = countryData.id;
                console.log('[Recommendation] Found country from destination parts:', countryName, countryData.id);
              }
            }
          }
        }
      }

      console.log('[Recommendation] Saving to shared_recommendations:', {
        tripId,
        title: recData.title,
        location_id: recData.location_id,
        destinationToSearch,
        cityId,
        countryId,
        google_place_id: recData.google_place_id,
      });

      const { error: sharedError } = await supabase
        .from('shared_recommendations')
        .insert({
          user_id: user.id,
          title: recData.title,
          description: recData.description || null,
          category: recData.category,
          city_id: cityId,
          country_id: countryId,
          google_place_id: recData.google_place_id || null,
          source_trip_id: tripId,
        });

      if (sharedError) {
        console.error('[Recommendation] Failed to save to shared_recommendations:', sharedError);
      } else {
        console.log('[Recommendation] Successfully saved to shared_recommendations');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripDetail', tripId] });
      queryClient.invalidateQueries({ queryKey: ['user-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['explore-recommendations'] });
    },
  });

  const addRecommendation = async (data: AddRecommendationInput) => {
    try {
      await mutation.mutateAsync(data);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return {
    addRecommendation,
    isAdding: mutation.isPending,
  };
}

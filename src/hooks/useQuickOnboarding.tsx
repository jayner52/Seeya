import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface CountrySelection {
  id: string;
  countryId: string;
  countryName: string;
  countryEmoji: string;
  countryCode: string;
}

// Keep for backward compatibility but now primarily use CountrySelection
export interface DestinationSelection {
  id: string;
  name: string;
  googlePlaceId: string;
  countryCode?: string;
  countryEmoji?: string;
  countryName?: string;
}

export interface QuickRecommendation {
  id: string;
  destinationId: string; // Now refers to countryId
  title: string;
  category: 'restaurant' | 'activity' | 'stay' | 'tip';
  rating: number;
  tips?: string;
  url?: string;
  googlePlaceId?: string;
}

export interface WanderlistSelection {
  id: string;
  name: string;
  googlePlaceId?: string;
  countryId?: string;
  countryEmoji?: string;
}

export function useQuickOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [visitedCountries, setVisitedCountries] = useState<CountrySelection[]>([]);
  const [wanderlist, setWanderlist] = useState<WanderlistSelection[]>([]);
  const [recommendations, setRecommendations] = useState<QuickRecommendation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle a country in the visited list
  const toggleCountry = useCallback((country: { id: string; name: string; emoji: string; code: string }) => {
    setVisitedCountries(prev => {
      const exists = prev.find(c => c.countryId === country.id);
      if (exists) {
        // Remove country and its recommendations
        setRecommendations(recs => recs.filter(r => r.destinationId !== country.id));
        return prev.filter(c => c.countryId !== country.id);
      }
      return [...prev, {
        id: crypto.randomUUID(),
        countryId: country.id,
        countryName: country.name,
        countryEmoji: country.emoji,
        countryCode: country.code,
      }];
    });
  }, []);

  const addWanderlistItem = useCallback((item: WanderlistSelection) => {
    const isDuplicate = wanderlist.some(w => 
      (item.countryId && w.countryId === item.countryId) ||
      (item.googlePlaceId && w.googlePlaceId === item.googlePlaceId) ||
      w.name.toLowerCase() === item.name.toLowerCase()
    );
    if (isDuplicate) {
      toast({ title: 'Already added', description: `${item.name} is already on your Wanderlist` });
      return;
    }
    // Check if already visited
    if (visitedCountries.some(c => c.countryName.toLowerCase() === item.name.toLowerCase())) {
      toast({ title: 'Already visited', description: `${item.name} is in your visited countries` });
      return;
    }
    setWanderlist(prev => [...prev, item]);
  }, [wanderlist, visitedCountries, toast]);

  const removeWanderlistItem = useCallback((id: string) => {
    setWanderlist(prev => prev.filter(w => w.id !== id));
  }, []);

  const addRecommendation = useCallback((rec: Omit<QuickRecommendation, 'id'>) => {
    setRecommendations(prev => [...prev, { ...rec, id: crypto.randomUUID() }]);
  }, []);

  const removeRecommendation = useCallback((id: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== id));
  }, []);

  const getRecommendationsForCountry = useCallback((countryId: string) => {
    return recommendations.filter(r => r.destinationId === countryId);
  }, [recommendations]);

  const submitOnboarding = useCallback(async () => {
    if (!user || (visitedCountries.length === 0 && wanderlist.length === 0)) return { success: false };

    setIsSubmitting(true);

    try {
      // Create a logged trip for each visited country
      const tripPromises = visitedCountries.map(async (country) => {
        const tripName = `Trip to ${country.countryName}`;
        
        const { data: trip, error } = await supabase
          .from('trips')
          .insert({
            owner_id: user.id,
            name: tripName,
            destination: country.countryName,
            visibility: 'full_details',
            is_flexible_dates: true,
            is_logged_past_trip: true,
          })
          .select()
          .single();

        if (error) throw error;
        return { trip, country };
      });

      const tripResults = await Promise.all(tripPromises);

      // Create recommendations linked to the trips with proper country_id
      const recPromises = recommendations.map(async (rec) => {
        const tripResult = tripResults.find(tr => tr.country.countryId === rec.destinationId);
        if (!tripResult) return;

        const { error } = await supabase
          .from('shared_recommendations')
          .insert({
            user_id: user.id,
            title: rec.title,
            category: rec.category,
            rating: rec.rating,
            tips: rec.tips || null,
            url: rec.url || null,
            google_place_id: rec.googlePlaceId || null,
            source_trip_id: tripResult.trip.id,
            country_id: tripResult.country.countryId, // Set country_id to fix the constraint error
          });

        if (error) throw error;
      });

      await Promise.all(recPromises);

      // Create wanderlist items
      if (wanderlist.length > 0) {
        const wanderlistInserts = wanderlist.map(item => ({
          user_id: user.id,
          name: item.name,
          google_place_id: item.googlePlaceId || null,
          country_id: item.countryId || null,
        }));

        const { error: wanderlistError } = await supabase
          .from('wanderlist')
          .insert(wanderlistInserts);

        if (wanderlistError) throw wanderlistError;
      }

      const parts = [];
      if (visitedCountries.length > 0) {
        parts.push(`${visitedCountries.length} ${visitedCountries.length === 1 ? 'country' : 'countries'}`);
      }
      if (wanderlist.length > 0) {
        parts.push(`${wanderlist.length} dream ${wanderlist.length === 1 ? 'destination' : 'destinations'}`);
      }
      if (recommendations.length > 0) {
        parts.push(`${recommendations.length} ${recommendations.length === 1 ? 'recommendation' : 'recommendations'}`);
      }

      toast({
        title: 'Welcome aboard!',
        description: `Logged ${parts.join(', ')}.`,
      });

      return { 
        success: true, 
        tripCount: visitedCountries.length, 
        wanderlistCount: wanderlist.length,
        recCount: recommendations.length 
      };
    } catch (error) {
      console.error('Onboarding submit error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Failed to save your data. Please try again.',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  }, [user, visitedCountries, wanderlist, recommendations, toast]);

  const reset = useCallback(() => {
    setVisitedCountries([]);
    setWanderlist([]);
    setRecommendations([]);
  }, []);

  // Backward compatibility aliases
  const destinations = visitedCountries.map(c => ({
    id: c.id,
    name: c.countryName,
    googlePlaceId: '',
    countryCode: c.countryCode,
    countryEmoji: c.countryEmoji,
    countryName: c.countryName,
  }));

  return {
    // New country-based API
    visitedCountries,
    toggleCountry,
    getRecommendationsForCountry,
    
    // Backward compatibility
    destinations,
    addDestination: () => {}, // Deprecated
    removeDestination: (id: string) => {
      const country = visitedCountries.find(c => c.id === id);
      if (country) {
        toggleCountry({ id: country.countryId, name: country.countryName, emoji: country.countryEmoji, code: country.countryCode });
      }
    },
    getRecommendationsForDestination: (id: string) => {
      const country = visitedCountries.find(c => c.id === id);
      return country ? getRecommendationsForCountry(country.countryId) : [];
    },
    
    // Shared
    wanderlist,
    recommendations,
    isSubmitting,
    addWanderlistItem,
    removeWanderlistItem,
    addRecommendation,
    removeRecommendation,
    submitOnboarding,
    reset,
  };
}

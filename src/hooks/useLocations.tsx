import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export interface Country {
  id: string;
  name: string;
  code: string;
  emoji: string;
  continent: string;
}

export interface City {
  id: string;
  country_id: string;
  name: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types?: string[];
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  country_code: string;
  country_name: string;
  country_emoji: string;
  types: string[];
}

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Country[];
    },
  });
}

export function useCities(countryId: string | null) {
  return useQuery({
    queryKey: ['cities', countryId],
    queryFn: async () => {
      if (!countryId) return [];
      
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('country_id', countryId)
        .order('name');
      
      if (error) throw error;
      return data as City[];
    },
    enabled: !!countryId,
  });
}

// Search for cities using Google Places API
export function useGooglePlacesSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchPlaces = async (query: string, countryCode?: string) => {
    if (!query || query.length < 2) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-places', {
        body: { query, type: 'city', countryCode },
      });

      if (fnError) {
        console.error('Error searching places:', fnError);
        setError('Failed to search places');
        setPredictions([]);
        return;
      }

      if (data.error) {
        console.error('Places API error:', data.error);
        setError(data.error);
        setPredictions([]);
        return;
      }

      setPredictions(data.predictions || []);
    } catch (err) {
      console.error('Error in searchPlaces:', err);
      setError('Failed to search places');
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearPredictions = () => {
    setPredictions([]);
    setError(null);
  };

  return {
    searchPlaces,
    predictions,
    isSearching,
    error,
    clearPredictions,
  };
}

// Search for countries using Google Places API
export function useGoogleCountrySearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchCountries = async (query: string) => {
    if (!query || query.length < 2) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-places', {
        body: { query, type: 'country' },
      });

      if (fnError) {
        console.error('Error searching countries:', fnError);
        setError('Failed to search countries');
        setPredictions([]);
        return;
      }

      if (data.error) {
        console.error('Places API error:', data.error);
        setError(data.error);
        setPredictions([]);
        return;
      }

      setPredictions(data.predictions || []);
    } catch (err) {
      console.error('Error in searchCountries:', err);
      setError('Failed to search countries');
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearPredictions = () => {
    setPredictions([]);
    setError(null);
  };

  return {
    searchCountries,
    predictions,
    isSearching,
    error,
    clearPredictions,
  };
}

// Search for establishments (restaurants, hotels, etc.) using Google Places API
export function useGoogleEstablishmentSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchEstablishments = async (query: string, countryCode?: string) => {
    if (!query || query.length < 2) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-places', {
        body: { query, type: 'establishment', countryCode },
      });

      if (fnError) {
        console.error('Error searching establishments:', fnError);
        setError('Failed to search places');
        setPredictions([]);
        return;
      }

      if (data.error) {
        console.error('Places API error:', data.error);
        setError(data.error);
        setPredictions([]);
        return;
      }

      setPredictions(data.predictions || []);
    } catch (err) {
      console.error('Error in searchEstablishments:', err);
      setError('Failed to search places');
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearPredictions = () => {
    setPredictions([]);
    setError(null);
  };

  return {
    searchEstablishments,
    predictions,
    isSearching,
    error,
    clearPredictions,
  };
}

// Get place details including country code
export function usePlaceDetails() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-places', {
        body: { placeId },
      });

      if (fnError) {
        console.error('Error getting place details:', fnError);
        setError('Failed to get place details');
        return null;
      }

      if (data.error) {
        console.error('Places API error:', data.error);
        setError(data.error);
        return null;
      }

      return data.placeDetails || null;
    } catch (err) {
      console.error('Error in getPlaceDetails:', err);
      setError('Failed to get place details');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getPlaceDetails,
    isLoading,
    error,
  };
}

// Get all cities across all countries for popular destinations display
export function useAllCities() {
  return useQuery({
    queryKey: ['all-cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select(`
          *,
          countries (
            id,
            name,
            code,
            emoji,
            continent
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data as (City & { countries: Country })[];
    },
  });
}

// Convert country code to flag emoji
export function getCountryEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map(c => 127397 + c.charCodeAt(0))
  );
}

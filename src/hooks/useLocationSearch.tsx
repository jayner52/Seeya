import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LocationResult {
  id: string;
  name: string;
  type: 'country' | 'city' | 'place';
  countryEmoji?: string;
  countryName?: string;
  countryId?: string;
  cityId?: string;
  googlePlaceId?: string;
  secondaryText?: string;
  continent?: string;
}

interface CountryResult {
  id: string;
  name: string;
  emoji: string;
  code: string;
  continent: string;
}

export function useLocationSearch() {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string, countriesOnly = false) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setIsSearching(true);

    try {
      // Search countries first (local database)
      const { data: countries } = await supabase
        .from('countries')
        .select('id, name, emoji, code, continent')
        .ilike('name', `%${query}%`)
        .limit(countriesOnly ? 10 : 5);

      const countryResults: LocationResult[] = (countries || []).map((c: CountryResult) => ({
        id: c.id,
        name: c.name,
        type: 'country' as const,
        countryEmoji: c.emoji,
        countryName: c.name,
        countryId: c.id,
        secondaryText: c.continent,
        continent: c.continent,
      }));

      if (countriesOnly) {
        setResults(countryResults);
        setIsSearching(false);
        return;
      }

      // Search cities via Google Places API
      const { data: placesData, error } = await supabase.functions.invoke('search-places', {
        body: { query, type: '(cities)' },
      });

      let placeResults: LocationResult[] = [];
      if (!error && placesData?.predictions) {
        placeResults = placesData.predictions.slice(0, 5).map((p: any) => ({
          id: `place_${p.place_id}`,
          name: p.structured_formatting?.main_text || p.description,
          type: 'city' as const,
          googlePlaceId: p.place_id,
          secondaryText: p.structured_formatting?.secondary_text || '',
        }));
      }

      // Combine: countries first, then cities
      setResults([...countryResults, ...placeResults]);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Search error:', err);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const searchCountriesOnly = useCallback(async (query: string) => {
    return search(query, true);
  }, [search]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    isSearching,
    search,
    searchCountriesOnly,
    clearResults,
  };
}

// Hook for fetching popular countries
export function usePopularCountries() {
  const [countries, setCountries] = useState<Array<{ id: string; name: string; emoji: string; continent: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      const { data } = await supabase
        .from('countries')
        .select('id, name, emoji, continent')
        .in('name', [
          'France', 'Japan', 'Italy', 'Spain', 'United States',
          'Thailand', 'Greece', 'Portugal', 'Australia', 'Mexico',
          'United Kingdom', 'Indonesia'
        ])
        .order('name');

      setCountries(data || []);
      setLoading(false);
    };

    fetchCountries();
  }, []);

  return { countries, loading };
}

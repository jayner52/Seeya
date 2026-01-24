import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TripLocation {
  id: string;
  trip_id: string;
  city_id: string | null;
  destination: string;
  order_index: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

// Helper to calculate min/max dates from all locations
const calculateLocationDateRange = (locations: { start_date: string | null; end_date: string | null }[]) => {
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const loc of locations) {
    if (loc.start_date) {
      if (!minDate || loc.start_date < minDate) minDate = loc.start_date;
    }
    if (loc.end_date) {
      if (!maxDate || loc.end_date > maxDate) maxDate = loc.end_date;
    }
  }

  return { minDate, maxDate };
};

// Update trip dates if locations extend beyond current trip dates
const updateTripDatesIfNeeded = async (tripId: string) => {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('start_date, end_date')
    .eq('id', tripId)
    .maybeSingle();

  if (tripError) {
    console.error('Error fetching trip for date update:', tripError);
    return;
  }

  const { data: allLocations, error: locError } = await supabase
    .from('trip_locations')
    .select('start_date, end_date')
    .eq('trip_id', tripId);

  if (locError) {
    console.error('Error fetching locations for date update:', locError);
    return;
  }

  const { minDate, maxDate } = calculateLocationDateRange(allLocations || []);

  const updates: { start_date?: string; end_date?: string } = {};

  if (minDate && (!trip?.start_date || minDate < trip.start_date)) {
    updates.start_date = minDate;
  }
  if (maxDate && (!trip?.end_date || maxDate > trip.end_date)) {
    updates.end_date = maxDate;
  }

  if (Object.keys(updates).length > 0) {
    console.log('Updating trip dates:', updates);
    const { error: updateError } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId);
    
    if (updateError) {
      console.error('Error updating trip dates:', updateError);
    }
  }
};

// Sort locations chronologically by start_date, nulls last
const sortLocationsByDate = (locations: TripLocation[]): TripLocation[] => {
  return [...locations].sort((a, b) => {
    // Locations without dates go last
    if (!a.start_date && !b.start_date) return a.order_index - b.order_index;
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    
    // Sort by start_date
    const dateA = new Date(a.start_date).getTime();
    const dateB = new Date(b.start_date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    
    // If same start date, sort by end_date
    if (a.end_date && b.end_date) {
      return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    }
    
    return a.order_index - b.order_index;
  });
};

async function fetchLocationsData(tripId: string): Promise<TripLocation[]> {
  const { data, error } = await supabase
    .from('trip_locations')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
  
  return sortLocationsByDate(data || []);
}

export function useTripLocations(tripId: string) {
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['tripLocations', tripId],
    queryFn: () => fetchLocationsData(tripId),
    enabled: !!tripId,
  });

  // Realtime subscription for live updates
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`trip_locations_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_locations',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tripLocations', tripId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  const addLocationMutation = useMutation({
    mutationFn: async (data: {
      destination: string;
      city_id?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      const maxIndex = locations.length > 0 
        ? Math.max(...locations.map(l => l.order_index)) 
        : -1;

      const { error } = await supabase
        .from('trip_locations')
        .insert({
          trip_id: tripId,
          destination: data.destination,
          city_id: data.city_id || null,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          order_index: maxIndex + 1,
        });

      if (error) throw error;
      
      // Update trip dates immediately after successful insert
      await updateTripDatesIfNeeded(tripId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripLocations', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripDetail', tripId] });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ locationId, data }: { locationId: string; data: Partial<TripLocation> }) => {
      const { error } = await supabase
        .from('trip_locations')
        .update(data)
        .eq('id', locationId);

      if (error) throw error;
      
      // Update trip dates immediately after successful update
      await updateTripDatesIfNeeded(tripId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripLocations', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripDetail', tripId] });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase
        .from('trip_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripLocations', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const reorderLocationsMutation = useMutation({
    mutationFn: async (newOrder: string[]) => {
      const updates = newOrder.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from('trip_locations')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripLocations', tripId] });
    },
  });

  // Wrapper functions for backward compatibility
  const addLocation = async (data: {
    destination: string;
    city_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      await addLocationMutation.mutateAsync(data);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const updateLocation = async (locationId: string, data: Partial<TripLocation>) => {
    try {
      await updateLocationMutation.mutateAsync({ locationId, data });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const deleteLocation = async (locationId: string) => {
    try {
      await deleteLocationMutation.mutateAsync(locationId);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const reorderLocations = async (newOrder: string[]) => {
    await reorderLocationsMutation.mutateAsync(newOrder);
  };

  return {
    locations,
    loading,
    fetchLocations: refetch,
    addLocation,
    updateLocation,
    deleteLocation,
    reorderLocations,
  };
}

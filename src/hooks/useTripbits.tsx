import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type TripbitCategory = 'accommodation' | 'transportation' | 'money' | 'reservation' | 'document' | 'other' | 'flight' | 'rental_car' | 'activity' | 'photos';

export interface TripbitParticipant {
  id: string;
  user_id: string;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Category-specific metadata types
export interface FlightMetadata {
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
}

export interface AccommodationMetadata {
  checkInTime?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  address?: string;
}

export interface RentalCarMetadata {
  company?: string;
  confirmationNumber?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupTime?: string;
  dropoffTime?: string;
}

export interface ReservationMetadata {
  confirmationNumber?: string;
  time?: string;
  partySize?: number;
  venue?: string;
  address?: string;
}

export interface ActivityMetadata {
  confirmationNumber?: string;
  time?: string;
  duration?: string;
  meetingPoint?: string;
  address?: string;
}

export interface PhotosMetadata {
  service?: string;
  albumName?: string;
  accessInfo?: string;
}

export interface TransportationMetadata {
  transportType?: 'train' | 'bus' | 'ferry' | 'shuttle' | 'metro' | 'taxi' | 'rideshare' | 'other';
  departureLocation?: string;
  arrivalLocation?: string;
  departureTime?: string;
  arrivalTime?: string;
  company?: string;
  confirmationNumber?: string;
}

export interface DocumentMetadata {
  documentType?: 'passport' | 'visa' | 'insurance' | 'itinerary' | 'tickets' | 'id' | 'other';
  expirationDate?: string;
  documentNumber?: string;
}

export interface TripbitAttachment {
  id: string;
  path: string;
  filename: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface BaseMetadata {
  attachments?: TripbitAttachment[];
}

export type TripbitMetadata = 
  | (FlightMetadata & BaseMetadata)
  | (AccommodationMetadata & BaseMetadata)
  | (RentalCarMetadata & BaseMetadata)
  | (ReservationMetadata & BaseMetadata)
  | (ActivityMetadata & BaseMetadata)
  | (PhotosMetadata & BaseMetadata)
  | (TransportationMetadata & BaseMetadata)
  | (DocumentMetadata & BaseMetadata)
  | (Record<string, unknown> & BaseMetadata);

export interface Tripbit {
  id: string;
  trip_id: string;
  user_id: string;
  category: TripbitCategory;
  title: string;
  description: string | null;
  url: string | null;
  location_id: string | null;
  start_date: string | null;
  end_date: string | null;
  metadata: TripbitMetadata | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  participants?: TripbitParticipant[];
}

export interface CreateTripbitData {
  category: TripbitCategory;
  title: string;
  description?: string;
  url?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  participantIds?: string[];
  metadata?: TripbitMetadata;
}

// Auto-detect category from URL
export function detectCategoryFromUrl(url: string): TripbitCategory | null {
  const lowercaseUrl = url.toLowerCase();
  
  // Flight - specific airlines and flight booking
  if (['delta.com', 'united.com', 'southwest.com', 'aa.com', 'jetblue.com', 'spirit.com', 'google.com/flights', 'kayak.com/flights', 'skyscanner.com', 'expedia.com/flights'].some(d => lowercaseUrl.includes(d))) {
    return 'flight';
  }
  
  // Rental Car
  if (['enterprise.com', 'hertz.com', 'avis.com', 'budget.com', 'nationalcar.com', 'turo.com', 'sixt.com', 'kayak.com/cars'].some(d => lowercaseUrl.includes(d))) {
    return 'rental_car';
  }
  
  // Activities
  if (['viator.com', 'getyourguide.com', 'klook.com', 'tripadvisor.com/attraction', 'airbnb.com/experiences', 'eventbrite.com'].some(d => lowercaseUrl.includes(d))) {
    return 'activity';
  }
  
  // Accommodation
  if (['airbnb.com', 'vrbo.com', 'booking.com', 'hotels.com', 'expedia.com/hotels', 'marriott.com', 'hilton.com', 'hyatt.com'].some(d => lowercaseUrl.includes(d))) {
    return 'accommodation';
  }
  
  // Transportation (non-flight, non-car)
  if (['uber.com', 'lyft.com', 'amtrak.com', 'greyhound.com', 'flixbus.com', 'rome2rio.com'].some(d => lowercaseUrl.includes(d))) {
    return 'transportation';
  }
  
  // Money
  if (['splitwise.com', 'venmo.com', 'paypal.com', 'zelle.com', 'cash.app', 'wise.com'].some(d => lowercaseUrl.includes(d))) {
    return 'money';
  }
  
  // Reservations
  if (['opentable.com', 'resy.com', 'yelp.com/reservations', 'sevenrooms.com', 'exploretock.com'].some(d => lowercaseUrl.includes(d))) {
    return 'reservation';
  }
  
  // Documents (excluding Dropbox photos paths)
  if (['docs.google.com', 'drive.google.com', 'notion.so', 'evernote.com', 'onedrive.com'].some(d => lowercaseUrl.includes(d))) {
    return 'document';
  }
  if (lowercaseUrl.includes('dropbox.com') && !lowercaseUrl.includes('/photos') && !lowercaseUrl.includes('/album')) {
    return 'document';
  }
  
  // Photos
  if (['photos.google.com', 'icloud.com/photos', 'flickr.com', 'amazon.com/photos', 'photos.amazon.com'].some(d => lowercaseUrl.includes(d))) {
    return 'photos';
  }
  if (lowercaseUrl.includes('dropbox.com') && (lowercaseUrl.includes('/photos') || lowercaseUrl.includes('/album'))) {
    return 'photos';
  }
  
  return null;
}

async function fetchTripbitsData(tripId: string, userId: string): Promise<Tripbit[]> {
  const { data: tripbitsOnly, error: tripbitsError } = await supabase
    .from('trip_resources')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true });
  
  if (tripbitsError) throw tripbitsError;
  
  // Fetch profiles separately
  const userIds = [...new Set(tripbitsOnly?.map(r => r.user_id) || [])];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds);
  
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Fetch tripbit participants
  const tripbitIds = tripbitsOnly?.map(r => r.id) || [];
  const { data: participants } = await supabase
    .from('resource_participants')
    .select('id, resource_id, user_id')
    .in('resource_id', tripbitIds);

  // Fetch participant profiles
  const participantUserIds = [...new Set(participants?.map(p => p.user_id) || [])];
  const { data: participantProfiles } = participantUserIds.length > 0 
    ? await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', participantUserIds)
    : { data: [] };
  
  const participantProfileMap = new Map<string, { id: string; username: string; full_name: string | null; avatar_url: string | null }>();
  participantProfiles?.forEach(p => participantProfileMap.set(p.id, p));
  
  // Group participants by tripbit
  const participantsByTripbit = new Map<string, TripbitParticipant[]>();
  participants?.forEach(p => {
    const existing = participantsByTripbit.get(p.resource_id) || [];
    const profile = participantProfileMap.get(p.user_id);
    existing.push({
      id: p.id,
      user_id: p.user_id,
      profile: profile ? {
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      } : undefined,
    });
    participantsByTripbit.set(p.resource_id, existing);
  });
  
  const profileMapTyped = new Map<string, { username: string; full_name: string | null; avatar_url: string | null }>();
  profiles?.forEach(p => profileMapTyped.set(p.id, { username: p.username, full_name: p.full_name, avatar_url: p.avatar_url }));
  
  return tripbitsOnly?.map(r => ({
    ...r,
    profile: profileMapTyped.get(r.user_id),
    participants: participantsByTripbit.get(r.id) || [],
  })) as Tripbit[] || [];
}

export function useTripbits(tripId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tripbits = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['tripbits', tripId, user?.id],
    queryFn: () => fetchTripbitsData(tripId!, user!.id),
    enabled: !!tripId && !!user,
  });

  const addTripbitMutation = useMutation({
    mutationFn: async (data: CreateTripbitData) => {
      if (!tripId || !user) throw new Error('Not authenticated');

      // Get max order_index for this trip
      const { data: maxOrderData } = await supabase
        .from('trip_resources')
        .select('order_index')
        .eq('trip_id', tripId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const nextOrderIndex = (maxOrderData?.order_index ?? -1) + 1;

      const insertData = {
        trip_id: tripId,
        user_id: user.id,
        category: data.category,
        title: data.title,
        description: data.description || null,
        url: data.url || null,
        location_id: data.locationId || null,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        metadata: data.metadata || {},
        order_index: nextOrderIndex,
      };
      
      const { data: newTripbit, error } = await supabase
        .from('trip_resources')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      // Add participants if any
      if (data.participantIds && data.participantIds.length > 0 && newTripbit) {
        const participantInserts = data.participantIds.map(userId => ({
          resource_id: newTripbit.id,
          user_id: userId,
        }));
        
        await supabase
          .from('resource_participants')
          .insert(participantInserts);
      }

      return newTripbit;
    },
    onSuccess: () => {
      toast.success('Tripbit added');
      queryClient.invalidateQueries({ queryKey: ['tripbits', tripId] });
    },
    onError: (error) => {
      console.error('Error adding tripbit:', error);
      toast.error('Failed to add tripbit');
    },
  });

  const updateTripbitMutation = useMutation({
    mutationFn: async ({ tripbitId, data }: { tripbitId: string; data: Partial<CreateTripbitData> }) => {
      if (!tripId || !user) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {};
      if (data.category !== undefined) updateData.category = data.category;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.url !== undefined) updateData.url = data.url || null;
      if (data.locationId !== undefined) updateData.location_id = data.locationId || null;
      if (data.startDate !== undefined) updateData.start_date = data.startDate || null;
      if (data.endDate !== undefined) updateData.end_date = data.endDate || null;
      if (data.metadata !== undefined) updateData.metadata = data.metadata || {};

      const { error } = await supabase
        .from('trip_resources')
        .update(updateData)
        .eq('id', tripbitId);

      if (error) throw error;

      // Update participants if provided
      if (data.participantIds !== undefined) {
        // Remove existing participants
        await supabase
          .from('resource_participants')
          .delete()
          .eq('resource_id', tripbitId);

        // Add new participants
        if (data.participantIds.length > 0) {
          const participantInserts = data.participantIds.map(userId => ({
            resource_id: tripbitId,
            user_id: userId,
          }));
          
          await supabase
            .from('resource_participants')
            .insert(participantInserts);
        }
      }
    },
    onSuccess: () => {
      toast.success('Tripbit updated');
      queryClient.invalidateQueries({ queryKey: ['tripbits', tripId] });
    },
    onError: (error) => {
      console.error('Error updating tripbit:', error);
      toast.error('Failed to update tripbit');
    },
  });

  const deleteTripbitMutation = useMutation({
    mutationFn: async (tripbitId: string) => {
      const { error } = await supabase
        .from('trip_resources')
        .delete()
        .eq('id', tripbitId);

      if (error) throw error;
      return tripbitId;
    },
    onSuccess: (tripbitId) => {
      toast.success('Tripbit deleted');
      // Optimistically update the cache
      queryClient.setQueryData(['tripbits', tripId, user?.id], (old: Tripbit[] | undefined) => 
        old?.filter(r => r.id !== tripbitId) ?? []
      );
    },
    onError: (error) => {
      console.error('Error deleting tripbit:', error);
      toast.error('Failed to delete tripbit');
    },
  });

  // Wrapper functions for backward compatibility
  const addTripbit = async (data: CreateTripbitData): Promise<boolean> => {
    try {
      await addTripbitMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  };

  const updateTripbit = async (tripbitId: string, data: Partial<CreateTripbitData>): Promise<boolean> => {
    try {
      await updateTripbitMutation.mutateAsync({ tripbitId, data });
      return true;
    } catch {
      return false;
    }
  };

  const deleteTripbit = async (tripbitId: string): Promise<boolean> => {
    try {
      await deleteTripbitMutation.mutateAsync(tripbitId);
      return true;
    } catch {
      return false;
    }
  };

  const reorderTripbits = async (reorderedIds: string[]): Promise<boolean> => {
    if (!tripId || !user) return false;
    
    try {
      // Update order_index for each tripbit
      const updates = reorderedIds.map((id, index) => 
        supabase
          .from('trip_resources')
          .update({ order_index: index })
          .eq('id', id)
      );
      
      await Promise.all(updates);
      
      // Optimistically update local cache
      queryClient.setQueryData(['tripbits', tripId, user?.id], (old: Tripbit[] | undefined) => {
        if (!old) return old;
        const tripbitMap = new Map(old.map(t => [t.id, t]));
        return reorderedIds
          .map((id, index) => {
            const tripbit = tripbitMap.get(id);
            if (tripbit) return { ...tripbit, order_index: index };
            return null;
          })
          .filter(Boolean) as Tripbit[];
      });
      
      return true;
    } catch (error) {
      console.error('Error reordering tripbits:', error);
      toast.error('Failed to reorder tripbits');
      return false;
    }
  };

  return {
    tripbits,
    loading,
    addTripbit,
    updateTripbit,
    deleteTripbit,
    reorderTripbits,
    refetch,
  };
}

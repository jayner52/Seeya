'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Input, Button, Spinner } from '@/components/ui';
import { DateRangePicker } from './DateRangePicker';
import { LocationPicker } from './LocationPicker';
import { VisibilitySelector } from './VisibilitySelector';
import { Trash2 } from 'lucide-react';
import type { VisibilityLevel } from '@/types/calendar';
import type { TripWithDetails } from '@/types/database';

interface Location {
  id: string;
  name: string;
  cityId?: string;
  country?: string;
}

interface EditTripFormProps {
  tripId: string;
}

export function EditTripForm({ tripId }: EditTripFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripWithDetails | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [visibility, setVisibility] = useState<VisibilityLevel>('full_details');

  useEffect(() => {
    async function fetchTrip() {
      const supabase = createClient();

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError || !tripData) {
        setError('Trip not found');
        setIsLoading(false);
        return;
      }

      const { data: locationsData } = await supabase
        .from('trip_locations')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index');

      setTrip({ ...tripData, locations: locationsData || [], participants: [] });

      // Populate form state
      setName(tripData.name);
      setDescription(tripData.description || '');
      setStartDate(tripData.start_date);
      setEndDate(tripData.end_date);
      setFlexibleDates(tripData.flexible_dates || false);
      setVisibility(tripData.visibility || 'full_details');

      if (locationsData && locationsData.length > 0) {
        setLocations(
          locationsData.map((loc: Record<string, unknown>) => ({
            id: loc.id as string,
            name: (loc.custom_location as string) || (loc.name as string) || '',
            cityId: (loc.city_id as string) || undefined,
          }))
        );
      }

      setIsLoading(false);
    }

    fetchTrip();
  }, [tripId]);

  const isValid = name.trim() && locations.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Update the trip
      const { error: tripError } = await supabase
        .from('trips')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate,
          end_date: endDate,
          visibility,
          flexible_dates: flexibleDates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tripId);

      if (tripError) throw tripError;

      // Delete existing locations
      await supabase
        .from('trip_locations')
        .delete()
        .eq('trip_id', tripId);

      // Create new locations
      if (locations.length > 0) {
        const locationInserts = locations.map((loc, index) => ({
          trip_id: tripId,
          custom_location: loc.name,  // Use custom_location to match iOS
          city_id: loc.cityId || null,
          order_index: index,
          arrival_date: index === 0 ? startDate : null,
          departure_date: index === locations.length - 1 ? endDate : null,
        }));

        const { error: locationError } = await supabase
          .from('trip_locations')
          .insert(locationInserts);

        if (locationError) throw locationError;
      }

      // Navigate back to trip detail
      router.push(`/trips/${tripId}`);
    } catch (err) {
      console.error('Error updating trip:', err);
      setError('Failed to update trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Delete trip (cascade should handle related records)
      const { error: deleteError } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (deleteError) throw deleteError;

      router.push('/trips');
    } catch (err) {
      console.error('Error deleting trip:', err);
      setError('Failed to delete trip. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12 text-seeya-text-secondary">
        Trip not found
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-seeya-error text-sm">
          {error}
        </div>
      )}

      {/* Trip Name */}
      <div>
        <Input
          label="Trip name"
          placeholder="Give your trip a name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Description (optional)
        </label>
        <textarea
          placeholder="What's this trip about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all resize-none placeholder:text-gray-400"
        />
      </div>

      {/* Locations */}
      <LocationPicker
        locations={locations}
        onChange={setLocations}
      />

      {/* Dates */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        flexible={flexibleDates}
        onFlexibleChange={setFlexibleDates}
      />

      {/* Visibility */}
      <VisibilitySelector
        value={visibility}
        onChange={setVisibility}
      />

      {/* Delete Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-seeya-error mb-2">Danger Zone</h3>
        {showDeleteConfirm ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-seeya-text mb-4">
              Are you sure you want to delete this trip? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
                className="bg-seeya-error hover:bg-red-600"
              >
                Delete Trip
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            leftIcon={<Trash2 size={16} />}
            className="text-seeya-error border-seeya-error/30 hover:bg-red-50"
          >
            Delete Trip
          </Button>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="purple"
          disabled={!isValid}
          isLoading={isSubmitting}
          className="flex-1"
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}

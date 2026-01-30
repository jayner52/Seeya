'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Input, Button } from '@/components/ui';
import { DateRangePicker } from './DateRangePicker';
import { LocationPicker } from './LocationPicker';
import { VisibilitySelector } from './VisibilitySelector';
import type { VisibilityLevel } from '@/types/calendar';

interface Location {
  id: string;
  name: string;
  cityId?: string;
  country?: string;
}

export function CreateTripForm() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [visibility, setVisibility] = useState<VisibilityLevel>('full_details');

  const isValid = name.trim() && locations.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate,
          end_date: endDate,
          user_id: user.id,
          visibility,
          flexible_dates: flexibleDates,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Create the owner as participant
      const { error: participantError } = await supabase
        .from('trip_participants')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          role: 'owner',
          status: 'accepted',
          joined_at: new Date().toISOString(),
        });

      if (participantError) throw participantError;

      // Create trip locations
      if (locations.length > 0) {
        const locationInserts = locations.map((loc, index) => ({
          trip_id: trip.id,
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

      // Navigate to the new trip
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      console.error('Error creating trip:', err);
      setError('Failed to create trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          Create Trip
        </Button>
      </div>
    </form>
  );
}

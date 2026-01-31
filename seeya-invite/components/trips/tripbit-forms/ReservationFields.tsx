'use client';

import { Input } from '@/components/ui';
import { RESERVATION_VENUE_TYPES } from '@/types/database';

interface ReservationFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function ReservationFields({ details, setDetails }: ReservationFieldsProps) {
  const updateField = (field: string, value: string | number) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Venue Name"
        placeholder="e.g., The French Laundry"
        value={(details.venueName as string) || ''}
        onChange={(e) => updateField('venueName', e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Venue Type
        </label>
        <select
          value={(details.venueType as string) || ''}
          onChange={(e) => updateField('venueType', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all bg-white"
        >
          <option value="">Select type...</option>
          {RESERVATION_VENUE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Address"
        placeholder="Full address"
        value={(details.address as string) || ''}
        onChange={(e) => updateField('address', e.target.value)}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-seeya-text mb-1.5">
            Reservation Time
          </label>
          <input
            type="time"
            value={(details.reservationTime as string) || ''}
            onChange={(e) => updateField('reservationTime', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-seeya-text mb-1.5">
            Party Size
          </label>
          <input
            type="number"
            min="1"
            placeholder="2"
            value={(details.partySize as number) || ''}
            onChange={(e) => updateField('partySize', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
          />
        </div>
      </div>

      <Input
        label="Confirmation Number"
        placeholder="Booking confirmation"
        value={(details.confirmationNumber as string) || ''}
        onChange={(e) => updateField('confirmationNumber', e.target.value)}
      />
    </div>
  );
}

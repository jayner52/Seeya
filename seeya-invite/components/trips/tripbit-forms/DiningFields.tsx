'use client';

import { Input } from '@/components/ui';

interface DiningFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function DiningFields({ details, setDetails }: DiningFieldsProps) {
  const updateField = (field: string, value: string | number) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Restaurant / Venue Name"
        placeholder="e.g., Le Cinq"
        value={(details.restaurantName as string) || ''}
        onChange={(e) => updateField('restaurantName', e.target.value)}
      />

      <Input
        label="Cuisine (optional)"
        placeholder="e.g., French, Italian, Sushi"
        value={(details.cuisine as string) || ''}
        onChange={(e) => updateField('cuisine', e.target.value)}
      />

      <Input
        label="Address"
        placeholder="e.g., 31 Avenue George V"
        value={(details.address as string) || ''}
        onChange={(e) => updateField('address', e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Reservation Time"
          placeholder="e.g., 7:30 PM"
          value={(details.reservationTime as string) || ''}
          onChange={(e) => updateField('reservationTime', e.target.value)}
        />
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
        label="Confirmation Number (optional)"
        placeholder="e.g., RES12345"
        value={(details.confirmationNumber as string) || ''}
        onChange={(e) => updateField('confirmationNumber', e.target.value)}
      />
    </div>
  );
}

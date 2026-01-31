'use client';

import { Input } from '@/components/ui';
import { STAY_PROPERTY_TYPES } from '@/types/database';

interface StayFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function StayFields({ details, setDetails }: StayFieldsProps) {
  const updateField = (field: string, value: string) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Property Name"
        placeholder="e.g., Grand Hotel"
        value={(details.propertyName as string) || ''}
        onChange={(e) => updateField('propertyName', e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Property Type
        </label>
        <select
          value={(details.propertyType as string) || ''}
          onChange={(e) => updateField('propertyType', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all bg-white"
        >
          <option value="">Select type...</option>
          {STAY_PROPERTY_TYPES.map((type) => (
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
            Check-in Time
          </label>
          <input
            type="time"
            value={(details.checkInTime as string) || ''}
            onChange={(e) => updateField('checkInTime', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-seeya-text mb-1.5">
            Check-out Time
          </label>
          <input
            type="time"
            value={(details.checkOutTime as string) || ''}
            onChange={(e) => updateField('checkOutTime', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
          />
        </div>
      </div>

      <Input
        label="Room Type"
        placeholder="e.g., King Suite"
        value={(details.roomType as string) || ''}
        onChange={(e) => updateField('roomType', e.target.value)}
      />

      <Input
        label="Confirmation Number"
        placeholder="Booking confirmation"
        value={(details.confirmationNumber as string) || ''}
        onChange={(e) => updateField('confirmationNumber', e.target.value)}
      />
    </div>
  );
}

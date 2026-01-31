'use client';

import { Input } from '@/components/ui';
import { CAR_VEHICLE_TYPES } from '@/types/database';

interface CarFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function CarFields({ details, setDetails }: CarFieldsProps) {
  const updateField = (field: string, value: string) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Rental Company"
        placeholder="e.g., Hertz, Enterprise"
        value={(details.rentalCompany as string) || ''}
        onChange={(e) => updateField('rentalCompany', e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Vehicle Type
        </label>
        <select
          value={(details.vehicleType as string) || ''}
          onChange={(e) => updateField('vehicleType', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all bg-white"
        >
          <option value="">Select type...</option>
          {CAR_VEHICLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Pickup Location"
        placeholder="Address or airport"
        value={(details.pickupLocation as string) || ''}
        onChange={(e) => updateField('pickupLocation', e.target.value)}
      />

      <Input
        label="Drop-off Location"
        placeholder="Address or airport"
        value={(details.dropoffLocation as string) || ''}
        onChange={(e) => updateField('dropoffLocation', e.target.value)}
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

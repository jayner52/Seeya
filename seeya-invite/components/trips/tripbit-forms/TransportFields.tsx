'use client';

import { Input } from '@/components/ui';
import { TRANSPORT_TYPES } from '@/types/database';

interface TransportFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function TransportFields({ details, setDetails }: TransportFieldsProps) {
  const updateField = (field: string, value: string) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Transport Type
        </label>
        <select
          value={(details.transportType as string) || ''}
          onChange={(e) => updateField('transportType', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all bg-white"
        >
          <option value="">Select type...</option>
          {TRANSPORT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Operator"
        placeholder="e.g., Amtrak, Greyhound"
        value={(details.operator as string) || ''}
        onChange={(e) => updateField('operator', e.target.value)}
      />

      <Input
        label="Departure Station"
        placeholder="From where"
        value={(details.departureStation as string) || ''}
        onChange={(e) => updateField('departureStation', e.target.value)}
      />

      <Input
        label="Arrival Station"
        placeholder="To where"
        value={(details.arrivalStation as string) || ''}
        onChange={(e) => updateField('arrivalStation', e.target.value)}
      />

      <Input
        label="Platform/Track"
        placeholder="e.g., Track 5"
        value={(details.platform as string) || ''}
        onChange={(e) => updateField('platform', e.target.value)}
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

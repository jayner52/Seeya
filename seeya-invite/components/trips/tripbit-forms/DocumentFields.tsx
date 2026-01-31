'use client';

import { Input } from '@/components/ui';
import { DOCUMENT_TYPES } from '@/types/database';

interface DocumentFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function DocumentFields({ details, setDetails }: DocumentFieldsProps) {
  const updateField = (field: string, value: string) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Document Type
        </label>
        <select
          value={(details.documentType as string) || ''}
          onChange={(e) => updateField('documentType', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all bg-white"
        >
          <option value="">Select type...</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Document Number"
        placeholder="ID or reference number"
        value={(details.documentNumber as string) || ''}
        onChange={(e) => updateField('documentNumber', e.target.value)}
      />

      <Input
        label="Holder Name"
        placeholder="Name on document"
        value={(details.holderName as string) || ''}
        onChange={(e) => updateField('holderName', e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Expiry Date
        </label>
        <input
          type="date"
          value={(details.expiryDate as string) || ''}
          onChange={(e) => updateField('expiryDate', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
        />
      </div>
    </div>
  );
}

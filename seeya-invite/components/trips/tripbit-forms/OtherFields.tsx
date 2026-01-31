'use client';

import { Input } from '@/components/ui';

interface OtherFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function OtherFields({ details, setDetails }: OtherFieldsProps) {
  const updateField = (field: string, value: string) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Custom Type"
        placeholder="What type of item is this?"
        value={(details.customType as string) || ''}
        onChange={(e) => updateField('customType', e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Description
        </label>
        <textarea
          placeholder="Add details..."
          value={(details.description as string) || ''}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all resize-none placeholder:text-gray-400"
        />
      </div>

      <Input
        label="Confirmation Number"
        placeholder="Reference or confirmation"
        value={(details.confirmationNumber as string) || ''}
        onChange={(e) => updateField('confirmationNumber', e.target.value)}
      />
    </div>
  );
}

'use client';

import { Input } from '@/components/ui';

interface PhotosFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function PhotosFields({ details, setDetails }: PhotosFieldsProps) {
  const updateField = (field: string, value: string | number) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Album Name"
        placeholder="e.g., Day 1 - Paris"
        value={(details.albumName as string) || ''}
        onChange={(e) => updateField('albumName', e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Photo Count
        </label>
        <input
          type="number"
          min="0"
          placeholder="0"
          value={(details.photoCount as number) || ''}
          onChange={(e) => updateField('photoCount', parseInt(e.target.value) || 0)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
        />
      </div>

      <Input
        label="Cover Photo URL"
        placeholder="https://..."
        value={(details.coverPhotoUrl as string) || ''}
        onChange={(e) => updateField('coverPhotoUrl', e.target.value)}
      />
    </div>
  );
}

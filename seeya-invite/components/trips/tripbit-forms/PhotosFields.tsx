'use client';

import { Input } from '@/components/ui';

const PHOTO_PLATFORMS = ['Google Photos', 'iCloud', 'Dropbox', 'OneDrive', 'Other'];

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
        label="Album Title"
        placeholder="e.g., Paris Trip 2026"
        value={(details.albumTitle as string) || ''}
        onChange={(e) => updateField('albumTitle', e.target.value)}
      />

      <Input
        label="Album Link"
        placeholder="https://photos.google.com/..."
        value={(details.albumLink as string) || ''}
        onChange={(e) => updateField('albumLink', e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Platform
        </label>
        <select
          value={(details.platform as string) || ''}
          onChange={(e) => updateField('platform', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all bg-white"
        >
          <option value="">Select platform...</option>
          {PHOTO_PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

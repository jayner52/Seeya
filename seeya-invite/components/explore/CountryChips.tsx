'use client';

import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';

interface CountryChipsProps {
  countries: string[];
  selectedCountry: string | null;
  onCountrySelect: (country: string | null) => void;
  className?: string;
}

export function CountryChips({
  countries,
  selectedCountry,
  onCountrySelect,
  className,
}: CountryChipsProps) {
  if (countries.length === 0) return null;

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2', className)}>
      {selectedCountry && (
        <button
          onClick={() => onCountrySelect(null)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-seeya-purple text-white"
        >
          <span>{selectedCountry}</span>
          <X size={14} />
        </button>
      )}
      {!selectedCountry &&
        countries.slice(0, 10).map((country) => (
          <button
            key={country}
            onClick={() => onCountrySelect(country)}
            className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-seeya-text-secondary hover:bg-gray-200 whitespace-nowrap transition-colors"
          >
            {country}
          </button>
        ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface Country {
  id: string;
  name: string;
  code: string;
}

interface ContinentSectionProps {
  continent: string;
  countries: Country[];
  selectedCountries: Set<string>;
  onToggleCountry: (countryId: string) => void;
  className?: string;
}

export function ContinentSection({
  continent,
  countries,
  selectedCountries,
  onToggleCountry,
  className,
}: ContinentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedCount = countries.filter((c) => selectedCountries.has(c.id)).length;

  return (
    <div className={cn('border border-gray-200 rounded-xl overflow-hidden', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={18} className="text-seeya-text-secondary" />
        ) : (
          <ChevronRight size={18} className="text-seeya-text-secondary" />
        )}
        <span className="flex-1 text-left font-medium text-seeya-text">
          {continent}
        </span>
        {selectedCount > 0 && (
          <span className="bg-seeya-purple text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {selectedCount}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-2">
          {countries.map((country) => {
            const isSelected = selectedCountries.has(country.id);
            return (
              <button
                key={country.id}
                onClick={() => onToggleCountry(country.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  isSelected
                    ? 'bg-seeya-purple/10 text-seeya-purple'
                    : 'bg-gray-50 text-seeya-text hover:bg-gray-100'
                )}
              >
                {isSelected ? (
                  <Check size={14} className="flex-shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="truncate">{country.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

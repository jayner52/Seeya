'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ContinentSection } from './ContinentSection';
import { Spinner } from '@/components/ui';

interface Country {
  id: string;
  name: string;
  code: string;
  continent: string;
}

interface CountrySelectorProps {
  selectedCountries: Set<string>;
  onToggleCountry: (countryId: string) => void;
  className?: string;
}

const continentOrder = [
  'Europe',
  'Asia',
  'North America',
  'South America',
  'Africa',
  'Oceania',
  'Antarctica',
];

export function CountrySelector({
  selectedCountries,
  onToggleCountry,
  className,
}: CountrySelectorProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCountries() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('countries')
        .select('id, name, code, continent')
        .order('name');

      if (!error && data) {
        setCountries(
          data.map((c: any) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            continent: c.continent || 'Other',
          }))
        );
      }
      setIsLoading(false);
    }

    fetchCountries();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  // Group countries by continent
  const groupedCountries = continentOrder.reduce((acc, continent) => {
    acc[continent] = countries.filter((c) => c.continent === continent);
    return acc;
  }, {} as Record<string, Country[]>);

  // Filter out empty continents
  const continents = continentOrder.filter(
    (c) => groupedCountries[c]?.length > 0
  );

  return (
    <div className={className}>
      <div className="space-y-3">
        {continents.map((continent) => (
          <ContinentSection
            key={continent}
            continent={continent}
            countries={groupedCountries[continent]}
            selectedCountries={selectedCountries}
            onToggleCountry={onToggleCountry}
          />
        ))}
      </div>
    </div>
  );
}

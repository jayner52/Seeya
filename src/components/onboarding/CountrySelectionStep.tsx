import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { 
  MapPin, Search, Check, ChevronDown, ArrowRight, 
  Globe, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Country {
  id: string;
  name: string;
  emoji: string;
  code: string;
  continent: string;
}

export interface CountrySelection {
  id: string;
  countryId: string;
  countryName: string;
  countryEmoji: string;
  countryCode: string;
}

interface CountrySelectionStepProps {
  selectedCountries: CountrySelection[];
  onToggleCountry: (country: Country) => void;
  onNext: () => void;
  onSkip: () => void;
}

const CONTINENT_ORDER = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania', 'Antarctica'];
const CONTINENT_ICONS: Record<string, string> = {
  'Europe': '🇪🇺',
  'Asia': '🌏',
  'North America': '🌎',
  'South America': '🌎',
  'Africa': '🌍',
  'Oceania': '🌏',
  'Antarctica': '🇦🇶',
};

export function CountrySelectionStep({ 
  selectedCountries, 
  onToggleCountry, 
  onNext,
  onSkip 
}: CountrySelectionStepProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [expandedContinents, setExpandedContinents] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchCountries() {
      const { data } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      
      if (data) {
        setCountries(data);
      }
      setLoading(false);
    }
    fetchCountries();
  }, []);

  const selectedCountryIds = useMemo(
    () => new Set(selectedCountries.map(c => c.countryId)),
    [selectedCountries]
  );

  const countriesByContinent = useMemo(() => {
    const grouped: Record<string, Country[]> = {};
    countries.forEach(country => {
      if (!grouped[country.continent]) {
        grouped[country.continent] = [];
      }
      grouped[country.continent].push(country);
    });
    return grouped;
  }, [countries]);

  const filteredCountries = useMemo(() => {
    if (!searchValue.trim()) return null;
    return countries.filter(c => 
      c.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [countries, searchValue]);

  const toggleContinent = (continent: string) => {
    setExpandedContinents(prev => {
      const next = new Set(prev);
      if (next.has(continent)) {
        next.delete(continent);
      } else {
        next.add(continent);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="text-center mb-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Globe className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-display text-xl font-semibold">Where have you been?</h2>
        <p className="text-sm text-muted-foreground">
          Tap to select countries • These will be logged as past trips
        </p>
      </div>

      <div className="space-y-2">
        {/* Selected count - dark pill */}
        {selectedCountries.length > 0 && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-medium text-sm">
              <MapPin className="w-3.5 h-3.5" />
              {selectedCountries.length} {selectedCountries.length === 1 ? 'country' : 'countries'} selected
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Country grid */}
        <ScrollArea className="h-[280px] -mx-1 px-1">
          {filteredCountries ? (
            // Search results - 4 columns, smaller tiles
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 py-1">
              {filteredCountries.map(country => (
                <CountryButton
                  key={country.id}
                  country={country}
                  isSelected={selectedCountryIds.has(country.id)}
                  onClick={() => onToggleCountry(country)}
                />
              ))}
              {filteredCountries.length === 0 && (
                <p className="col-span-4 text-center text-sm text-muted-foreground py-4">
                  No countries found
                </p>
              )}
            </div>
          ) : (
            // Continent groups
            <div className="space-y-1.5 py-1">
              {CONTINENT_ORDER.map(continent => {
                const continentCountries = countriesByContinent[continent];
                if (!continentCountries?.length) return null;
                
                const isExpanded = expandedContinents.has(continent);
                const selectedInContinent = continentCountries.filter(c => 
                  selectedCountryIds.has(c.id)
                ).length;

                return (
                  <Collapsible 
                    key={continent} 
                    open={isExpanded}
                    onOpenChange={() => toggleContinent(continent)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{CONTINENT_ICONS[continent]}</span>
                        <span className="font-medium text-sm">{continent}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({continentCountries.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selectedInContinent > 0 && (
                          <span className="text-[10px] font-medium text-white bg-slate-700 px-1.5 py-0.5 rounded-full">
                            {selectedInContinent}
                          </span>
                        )}
                        <ChevronDown className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 pt-1.5 pb-0.5">
                        {continentCountries.map(country => (
                          <CountryButton
                            key={country.id}
                            country={country}
                            isSelected={selectedCountryIds.has(country.id)}
                            onClick={() => onToggleCountry(country)}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <p className="text-[10px] text-muted-foreground text-center">
          You can add specific cities later in your profile
        </p>
      </div>

      <div className="flex gap-3 pt-3">
        <Button variant="ghost" className="text-muted-foreground" onClick={onSkip}>
          Skip for now
        </Button>
        <Button 
          className="flex-1 gap-1" 
          onClick={onNext}
        >
          {selectedCountries.length > 0 ? 'Continue' : 'Skip'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}

function CountryButton({ 
  country, 
  isSelected, 
  onClick 
}: { 
  country: Country; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all text-center min-h-[52px]",
        isSelected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-muted/30 hover:bg-muted hover:border-muted-foreground/30"
      )}
    >
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}
      <span className="text-lg leading-none">{country.emoji}</span>
      <span className="text-[9px] font-medium leading-tight line-clamp-2 text-muted-foreground">
        {country.name}
      </span>
    </button>
  );
}

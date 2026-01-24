import { useState, useEffect } from 'react';
import { Globe, MapPin, Building2, Compass, Plus, X, ChevronDown, ChevronRight, Loader2, Sparkles, Search, Sun, Mountain, Landmark, TreePine, Leaf, Waves, Snowflake, LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WanderlistCountry } from '@/hooks/useWanderlist';
import { cn } from '@/lib/utils';

interface WanderlistSectionProps {
  countries: WanderlistCountry[];
  isOwnProfile: boolean;
  userName: string;
  onRemoveCountry: (id: string) => void;
  onRemoveCity: (id: string) => void;
  onAddCountry: (country: any) => void;
  onAddCity: (city: any, countryId: string) => void;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  isSearching: boolean;
  searchResults: any[];
  popularCountries: any[];
  onClearResults: () => void;
  // City search within a country
  citySearchValue: string;
  setCitySearchValue: (value: string) => void;
  isCitySearching: boolean;
  citySearchResults: any[];
  onSearchCities: (query: string, countryId: string) => void;
  onClearCityResults: () => void;
}

// Unified brand styling with unique icons per continent
const continentIcons: Record<string, LucideIcon> = {
  'Africa': Sun,
  'Asia': Mountain,
  'Europe': Landmark,
  'North America': TreePine,
  'South America': Leaf,
  'Oceania': Waves,
  'Antarctica': Snowflake,
};

const continentOrder = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania', 'Antarctica'];

const STORAGE_KEY_CONTINENTS = 'wanderlist-open-continents';
const STORAGE_KEY_COUNTRY = 'wanderlist-expanded-country';

export function WanderlistSection({
  countries,
  isOwnProfile,
  userName,
  onRemoveCountry,
  onRemoveCity,
  onAddCountry,
  onAddCity,
  showAddForm,
  setShowAddForm,
  searchValue,
  setSearchValue,
  isSearching,
  searchResults,
  popularCountries,
  onClearResults,
  citySearchValue,
  setCitySearchValue,
  isCitySearching,
  citySearchResults,
  onSearchCities,
  onClearCityResults,
}: WanderlistSectionProps) {
  const [openContinents, setOpenContinents] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTINENTS);
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set(continentOrder);
  });
  
  const [expandedCountry, setExpandedCountry] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_COUNTRY) || null;
  });
  
  const [addingCityToCountry, setAddingCityToCountry] = useState<string | null>(null);

  // Persist accordion state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONTINENTS, JSON.stringify([...openContinents]));
  }, [openContinents]);

  useEffect(() => {
    if (expandedCountry) {
      localStorage.setItem(STORAGE_KEY_COUNTRY, expandedCountry);
    } else {
      localStorage.removeItem(STORAGE_KEY_COUNTRY);
    }
  }, [expandedCountry]);

  // Group countries by continent
  const groupedByContinent = countries.reduce((acc, country) => {
    const continent = country.continent || 'Other';
    if (!acc[continent]) acc[continent] = [];
    acc[continent].push(country);
    return acc;
  }, {} as Record<string, WanderlistCountry[]>);

  // Get active continents in preferred order
  const activeContinents = continentOrder.filter(c => groupedByContinent[c]);

  // Calculate continent coverage
  const coveredContinents = new Set(countries.map(c => c.continent).filter(Boolean));
  const totalMainContinents = 7;
  const coverageCount = coveredContinents.size;

  const toggleContinent = (continent: string) => {
    setOpenContinents(prev => {
      const next = new Set(prev);
      if (next.has(continent)) {
        next.delete(continent);
      } else {
        next.add(continent);
      }
      return next;
    });
  };

  const toggleCountry = (countryId: string) => {
    setExpandedCountry(prev => prev === countryId ? null : countryId);
    setAddingCityToCountry(null);
    setCitySearchValue('');
    onClearCityResults();
  };

  const startAddingCity = (countryId: string) => {
    setAddingCityToCountry(countryId);
    setCitySearchValue('');
    onClearCityResults();
  };

  const handleCitySearch = (query: string, countryId: string) => {
    setCitySearchValue(query);
    if (query.length >= 2) {
      onSearchCities(query, countryId);
    } else {
      onClearCityResults();
    }
  };

  return (
    <div className="mb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-semibold mb-1 flex items-center gap-2">
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-full p-1.5 shadow-sm">
              <Compass className="w-4 h-4 text-white" />
            </div>
            {isOwnProfile ? 'My Wanderlist' : 'Wanderlist'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile ? 'Countries you dream of visiting' : `Countries ${userName} dreams of visiting`}
          </p>
        </div>
        
        {/* Progress indicator */}
        {countries.length > 0 && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 px-3 py-1.5 rounded-full border border-violet-200/50 dark:border-violet-700/50">
            <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
              {coverageCount}/{totalMainContinents} continents
            </span>
          </div>
        )}
      </div>

      {/* Continent Progress Dots */}
      {countries.length > 0 && (
        <div className="flex items-center gap-1 mb-3">
          {continentOrder.map((continent) => {
            const Icon = continentIcons[continent];
            const hasDreams = coveredContinents.has(continent);
            return (
              <div
                key={continent}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  hasDreams 
                    ? "bg-violet-100 dark:bg-violet-900/40 border border-violet-300 dark:border-violet-700" 
                    : "bg-muted/30 border border-border/30 opacity-40"
                )}
                title={continent}
              >
                <Icon className={cn("w-3.5 h-3.5", hasDreams ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground")} />
              </div>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      {countries.length > 0 ? (
        <div className="space-y-2">
          {activeContinents.map((continent) => {
            const Icon = continentIcons[continent] || Globe;
            const continentCountries = groupedByContinent[continent] || [];
            const isOpen = openContinents.has(continent);

            return (
              <Collapsible
                key={continent}
                open={isOpen}
                onOpenChange={() => toggleContinent(continent)}
              >
                <div className={cn(
                  "rounded-lg border border-violet-200/60 dark:border-violet-800/60 overflow-hidden transition-all",
                  isOpen ? 'shadow-sm' : ''
                )}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-3 py-2 flex items-center justify-between bg-gradient-to-r from-violet-50/80 to-purple-50/40 dark:from-violet-900/20 dark:to-purple-900/10 transition-colors hover:from-violet-100/80 hover:to-purple-100/40 dark:hover:from-violet-900/30 dark:hover:to-purple-900/20">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-800/50 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="font-medium text-sm text-violet-800 dark:text-violet-300">
                          {continent}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-violet-600/80 dark:text-violet-400/80">
                          {continentCountries.length}
                        </span>
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform text-violet-500",
                          isOpen ? "rotate-180" : ""
                        )} />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-2 py-1.5 space-y-1 bg-violet-25/50 dark:bg-violet-950/20">
                      {continentCountries.map((country) => {
                        const isExpanded = expandedCountry === country.country_id;
                        const isAddingCity = addingCityToCountry === country.country_id;
                        const cityCount = country.cities.length;
                        
                        return (
                          <div 
                            key={country.id}
                            className={cn(
                              "rounded-md border border-border/50 bg-background/95 transition-all",
                              isExpanded ? 'shadow-sm' : ''
                            )}
                          >
                            {/* Country Header */}
                            <button
                              onClick={() => toggleCountry(country.country_id)}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-muted/50 transition-colors rounded-md"
                            >
                              <ChevronRight className={cn(
                                "w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0",
                                isExpanded ? "rotate-90" : ""
                              )} />
                              {country.country_emoji && (
                                <span className="text-base">{country.country_emoji}</span>
                              )}
                              <span className="font-medium text-sm flex-1 text-left text-foreground">
                                {country.name}
                              </span>
                              {cityCount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {cityCount} {cityCount === 1 ? 'city' : 'cities'}
                                </span>
                              )}
                              {isOwnProfile && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onRemoveCountry(country.id); }}
                                  className="p-0.5 hover:bg-destructive/10 rounded transition-colors opacity-50 hover:opacity-100"
                                >
                                  <X className="w-3 h-3 text-destructive" />
                                </button>
                              )}
                            </button>
                            
                            {/* Expanded Content: Cities */}
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-1 border-t border-border/50">
                                {/* Existing cities */}
                                {country.cities.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {country.cities.map((city) => (
                                      <Badge
                                        key={city.id}
                                        variant="outline"
                                        className="px-2.5 py-1.5 text-sm bg-muted/50 flex items-center gap-1.5"
                                      >
                                        <Building2 className="w-3 h-3 text-muted-foreground" />
                                        <span>{city.name}</span>
                                        {isOwnProfile && (
                                          <button
                                            onClick={() => onRemoveCity(city.id)}
                                            className="ml-0.5 hover:text-destructive transition-colors opacity-60 hover:opacity-100"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Add city form */}
                                {isOwnProfile && (
                                  <>
                                    {!isAddingCity ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startAddingCity(country.country_id)}
                                        className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add specific cities
                                      </Button>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <div className="relative flex-1">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                            <Input
                                              placeholder={`Search cities in ${country.name}...`}
                                              value={citySearchValue}
                                              onChange={(e) => handleCitySearch(e.target.value, country.country_id)}
                                              className="h-8 text-sm pl-8"
                                              autoFocus
                                            />
                                            {isCitySearching && (
                                              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin" />
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => {
                                              setAddingCityToCountry(null);
                                              setCitySearchValue('');
                                              onClearCityResults();
                                            }}
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                        
                                        {citySearchResults.length > 0 && (
                                          <div className="border rounded-md overflow-hidden bg-card shadow-sm">
                                            {citySearchResults.map((result: any) => (
                                              <button
                                                key={result.place_id || result.id}
                                                onClick={() => {
                                                  onAddCity(result, country.country_id);
                                                  setAddingCityToCountry(null);
                                                  setCitySearchValue('');
                                                  onClearCityResults();
                                                }}
                                                className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 text-sm border-b last:border-b-0"
                                              >
                                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span>{result.main_text || result.name}</span>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                {/* Empty state for cities */}
                                {country.cities.length === 0 && !isAddingCity && (
                                  <p className="text-xs text-muted-foreground">
                                    {isOwnProfile 
                                      ? 'No specific cities added yet' 
                                      : 'No specific cities'}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-border rounded-xl bg-gradient-to-b from-muted/30 to-muted/10">
          <div className="flex justify-center gap-2 mb-3">
            {['🌍', '🌎', '🌏'].map((emoji, i) => (
              <span key={i} className="text-3xl opacity-60">{emoji}</span>
            ))}
          </div>
          <p className="text-muted-foreground mb-1">
            {isOwnProfile 
              ? "Start building your dream destinations list" 
              : `${userName} hasn't added any dream destinations yet`}
          </p>
          {isOwnProfile && (
            <p className="text-xs text-muted-foreground/70">
              Add countries you want to explore, then add specific cities
            </p>
          )}
        </div>
      )}

      {/* Add country form for own profile */}
      {isOwnProfile && (
        <div className="mt-4">
          {!showAddForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="gap-1.5 border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            >
              <Plus className="w-4 h-4" />
              Add country
            </Button>
          ) : (
            <Card className="border-violet-200 dark:border-violet-800 shadow-sm">
              <CardContent className="p-4 space-y-4">
                {/* Popular countries quick-add */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Quick add countries</div>
                  <div className="flex flex-wrap gap-2">
                    {popularCountries.slice(0, 8).map((country: any) => (
                      <button
                        key={country.id}
                        onClick={() => onAddCountry(country)}
                        disabled={countries.some(c => c.country_id === country.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-sm font-medium transition-all hover:scale-105 border border-violet-200 dark:border-violet-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <span>{country.emoji}</span>
                        {country.name}
                        <Plus className="w-3 h-3 text-violet-500" />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Search input */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Or search countries</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search countries..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowAddForm(false);
                        setSearchValue('');
                        onClearResults();
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {isSearching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                    {searchResults.filter((r: any) => r.type === 'country').map((result: any) => (
                      <button
                        key={result.id}
                        onClick={() => onAddCountry(result)}
                        disabled={countries.some(c => c.country_id === result.id)}
                        className="w-full px-3 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3 text-sm border-b last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="rounded-full p-1.5 bg-violet-100 dark:bg-violet-900/30">
                          <Globe className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2">
                            {result.countryEmoji && <span>{result.countryEmoji}</span>}
                            {result.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

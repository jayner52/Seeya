import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Star, Utensils, Compass, Home, Lightbulb, ExternalLink, Globe } from 'lucide-react';
import { GroupedRecommendations, UserRecommendation } from '@/hooks/useUserRecommendations';

interface ProfileRecommendationsSectionProps {
  grouped: GroupedRecommendations;
  loading?: boolean;
}

const categoryConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  restaurant: { icon: Utensils, label: 'Restaurant', className: 'bg-orange-100 text-orange-700' },
  activity: { icon: Compass, label: 'Activity', className: 'bg-blue-100 text-blue-700' },
  stay: { icon: Home, label: 'Stay', className: 'bg-purple-100 text-purple-700' },
  tip: { icon: Lightbulb, label: 'Tip', className: 'bg-amber-100 text-amber-700' },
};

function RecommendationItem({ rec }: { rec: UserRecommendation }) {
  const config = categoryConfig[rec.category] || categoryConfig.tip;
  const Icon = config.icon;

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className={`gap-1 text-xs ${config.className}`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </Badge>
            {rec.rating && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: rec.rating }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            )}
          </div>
          <h4 className="font-medium text-sm text-foreground truncate">{rec.title}</h4>
          {rec.tips && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">"{rec.tips}"</p>
          )}
        </div>
        {rec.url && (
          <a
            href={rec.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export function ProfileRecommendationsSection({ grouped, loading }: ProfileRecommendationsSectionProps) {
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  const countries = Object.values(grouped);
  
  if (countries.length === 0) {
    return null;
  }

  const toggleCountry = (countryId: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(countryId)) {
        next.delete(countryId);
      } else {
        next.add(countryId);
      }
      return next;
    });
  };

  const toggleCity = (cityId: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        next.delete(cityId);
      } else {
        next.add(cityId);
      }
      return next;
    });
  };

  // Count total recommendations (including country-wide)
  const totalRecs = countries.reduce(
    (acc, country) =>
      acc +
      (country.countryWide?.length || 0) +
      Object.values(country.cities).reduce((cityAcc, city) => cityAcc + city.recommendations.length, 0),
    0
  );

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <div className="bg-amber-500 rounded-full p-1.5">
          <Star className="w-4 h-4 text-white" />
        </div>
        Recommendations ({totalRecs})
      </h2>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {countries.map(({ country, cities, countryWide }) => {
              const isCountryExpanded = expandedCountries.has(country.id);
              const cityCount = Object.keys(cities).length;
              const countryWideCount = countryWide?.length || 0;
              const recCount = Object.values(cities).reduce(
                (acc, city) => acc + city.recommendations.length,
                0
              ) + countryWideCount;

              return (
                <Collapsible key={country.id} open={isCountryExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-auto py-3 px-3 hover:bg-muted/50"
                      onClick={() => toggleCountry(country.id)}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <span className="text-lg">{country.emoji}</span>
                        {country.name}
                      </span>
                      <span className="flex items-center gap-2 text-muted-foreground text-sm">
                        <span>
                          {cityCount > 0 && `${cityCount} ${cityCount === 1 ? 'city' : 'cities'}, `}
                          {recCount} recs
                        </span>
                        {isCountryExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 space-y-1">
                      {/* Country-wide recommendations (no specific city) */}
                      {countryWide && countryWide.length > 0 && (
                        <Collapsible open={expandedCities.has(`${country.id}-general`)}>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-between h-auto py-2 px-3 hover:bg-muted/50"
                              onClick={() => toggleCity(`${country.id}-general`)}
                            >
                              <span className="text-sm font-medium flex items-center gap-2">
                                <Globe className="w-3 h-3 text-muted-foreground" />
                                General
                              </span>
                              <span className="flex items-center gap-2 text-muted-foreground text-xs">
                                <span>{countryWide.length} recs</span>
                                {expandedCities.has(`${country.id}-general`) ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </span>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="pl-4 pr-2">
                              {countryWide.map((rec) => (
                                <RecommendationItem key={rec.id} rec={rec} />
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      
                      {/* City-specific recommendations */}
                      {Object.values(cities).map(({ city, recommendations }) => {
                        const isCityExpanded = expandedCities.has(city.id);

                        return (
                          <Collapsible key={city.id} open={isCityExpanded}>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full justify-between h-auto py-2 px-3 hover:bg-muted/50"
                                onClick={() => toggleCity(city.id)}
                              >
                                <span className="text-sm font-medium">{city.name}</span>
                                <span className="flex items-center gap-2 text-muted-foreground text-xs">
                                  <span>{recommendations.length} recs</span>
                                  {isCityExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </span>
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="pl-4 pr-2">
                                {recommendations.map((rec) => (
                                  <RecommendationItem key={rec.id} rec={rec} />
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

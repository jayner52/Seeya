import { useState } from 'react';
import { ChevronDown, ChevronRight, Star, ExternalLink, Bookmark, Utensils, Compass, Home, Lightbulb, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GroupedSavedRecommendations, SavedRecommendation } from '@/hooks/useSavedRecommendations';
import { cn } from '@/lib/utils';

interface SavedRecommendationsSectionProps {
  grouped: GroupedSavedRecommendations;
  loading?: boolean;
  onUnsave?: (sharedRecommendationId: string) => void;
}

const categoryConfig = {
  restaurant: { icon: Utensils, label: 'Restaurant', bgClass: 'bg-orange-500/10', textClass: 'text-orange-600' },
  activity: { icon: Compass, label: 'Activity', bgClass: 'bg-blue-500/10', textClass: 'text-blue-600' },
  stay: { icon: Home, label: 'Stay', bgClass: 'bg-green-500/10', textClass: 'text-green-600' },
  tip: { icon: Lightbulb, label: 'Tip', bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-600' },
};

function SavedRecommendationItem({ item, onUnsave }: { item: SavedRecommendation; onUnsave?: (id: string) => void }) {
  const rec = item.recommendation;
  const config = categoryConfig[rec.category] || categoryConfig.tip;
  const Icon = config.icon;

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={cn("p-2 rounded-lg shrink-0", config.bgClass)}>
        <Icon className={cn("w-4 h-4", config.textClass)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{rec.title}</p>
            {rec.rating && (
              <div className="flex items-center gap-0.5 mt-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3 h-3",
                      i < rec.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {rec.url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(rec.url!, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
            {onUnsave && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUnsave(item.shared_recommendation_id)}
              >
                <Bookmark className="w-3.5 h-3.5 fill-current text-primary" />
              </Button>
            )}
          </div>
        </div>
        {rec.tips && (
          <p className="text-sm text-muted-foreground mt-1 italic line-clamp-2">"{rec.tips}"</p>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={rec.profile.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">
              {getInitials(rec.profile.full_name, rec.profile.username)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            from {rec.profile.full_name || rec.profile.username}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SavedRecommendationsSection({ grouped, loading, onUnsave }: SavedRecommendationsSectionProps) {
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

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

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <div className="bg-primary rounded-full p-1.5">
            <Bookmark className="w-4 h-4 text-primary-foreground" />
          </div>
          Saved Recommendations
        </h2>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const countryIds = Object.keys(grouped);
  if (countryIds.length === 0) {
    return null;
  }

  const totalCount = countryIds.reduce((acc, countryId) => {
    const country = grouped[countryId];
    const cityCount = Object.values(country.cities).reduce((c, city) => c + city.recommendations.length, 0);
    return acc + cityCount + country.countryWide.length;
  }, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <div className="bg-primary rounded-full p-1.5">
          <Bookmark className="w-4 h-4 text-primary-foreground" />
        </div>
        Saved Recommendations ({totalCount})
      </h2>

      <div className="space-y-2">
        {countryIds.map((countryId) => {
          const countryData = grouped[countryId];
          const isCountryExpanded = expandedCountries.has(countryId);
          const cityIds = Object.keys(countryData.cities);
          const countryItemCount =
            Object.values(countryData.cities).reduce((c, city) => c + city.recommendations.length, 0) +
            countryData.countryWide.length;

          return (
            <div key={countryId} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCountry(countryId)}
                className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{countryData.country.emoji}</span>
                  <span className="font-medium">{countryData.country.name}</span>
                  <span className="text-sm text-muted-foreground">({countryItemCount})</span>
                </div>
                {isCountryExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isCountryExpanded && (
                <div className="border-t border-border bg-accent/20">
                  {/* Country-wide recommendations */}
                  {countryData.countryWide.length > 0 && (
                    <div className="px-4">
                      {countryData.countryWide.map((item) => (
                        <SavedRecommendationItem key={item.id} item={item} onUnsave={onUnsave} />
                      ))}
                    </div>
                  )}

                  {/* Cities */}
                  {cityIds.map((cityId) => {
                    const cityData = countryData.cities[cityId];
                    const isCityExpanded = expandedCities.has(cityId);

                    return (
                      <div key={cityId} className="border-t border-border/50">
                        <button
                          onClick={() => toggleCity(cityId)}
                          className="w-full flex items-center justify-between p-3 pl-6 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{cityData.city.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({cityData.recommendations.length})
                            </span>
                          </div>
                          {isCityExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>

                        {isCityExpanded && (
                          <div className="px-6 pb-2">
                            {cityData.recommendations.map((item) => (
                              <SavedRecommendationItem key={item.id} item={item} onUnsave={onUnsave} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

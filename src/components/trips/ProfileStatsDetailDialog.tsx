import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Star, Globe, Building2, Utensils, Compass, Home, Lightbulb, ExternalLink, Plane } from 'lucide-react';
import { UserRecommendation } from '@/hooks/useUserRecommendations';

interface Trip {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
}

interface CountryData {
  id: string;
  name: string;
  emoji: string;
  recommendationCount: number;
  tripCount?: number;
}

interface CityData {
  id: string;
  name: string;
  countryEmoji: string;
  countryName: string;
  recommendationCount: number;
  tripCount?: number;
}

export type StatDetailType = 'trips' | 'recommendations' | 'countries' | 'cities';

interface ProfileStatsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: StatDetailType | null;
  trips?: Trip[];
  recommendations?: UserRecommendation[];
  countries?: CountryData[];
  cities?: CityData[];
  userName?: string;
}

const categoryConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  restaurant: { icon: Utensils, label: 'Restaurant', color: 'text-orange-500' },
  activity: { icon: Compass, label: 'Activity', color: 'text-blue-500' },
  stay: { icon: Home, label: 'Stay', color: 'text-purple-500' },
  tip: { icon: Lightbulb, label: 'Tip', color: 'text-yellow-500' },
};

const getTitles = (userName?: string): Record<StatDetailType, { title: string; icon: React.ElementType; color: string }> => ({
  trips: { title: userName ? `${userName}'s Trips` : 'Trips', icon: Plane, color: 'text-blue-500' },
  recommendations: { title: userName ? `${userName}'s Recommendations` : 'Recommendations', icon: Star, color: 'text-amber-500' },
  countries: { title: 'Countries Visited', icon: Globe, color: 'text-emerald-500' },
  cities: { title: 'Cities Visited', icon: Building2, color: 'text-purple-500' },
});

export function ProfileStatsDetailDialog({
  open,
  onOpenChange,
  type,
  trips = [],
  recommendations = [],
  countries = [],
  cities = [],
  userName,
}: ProfileStatsDetailDialogProps) {
  if (!type) return null;

  const titles = getTitles(userName);
  const { title, icon: Icon, color } = titles[type];

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${color}`} />
            {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pr-4">
            {type === 'trips' && (
              trips.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No trips yet</p>
              ) : (
                trips.map((trip) => (
                  <div key={trip.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Plane className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{trip.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {trip.destination}
                        {trip.start_date && ` • ${formatDate(trip.start_date)}`}
                      </p>
                    </div>
                  </div>
                ))
              )
            )}

            {type === 'recommendations' && (
              recommendations.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No recommendations yet</p>
              ) : (
                recommendations.map((rec) => {
                  const config = categoryConfig[rec.category] || categoryConfig.tip;
                  const RecIcon = config.icon;
                  return (
                    <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className={`p-1.5 rounded-full bg-muted ${config.color} shrink-0`}>
                        <RecIcon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{rec.title}</span>
                          {rec.rating && (
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{rec.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {rec.city?.name && `${rec.city.name}, `}{rec.country?.name}
                        </p>
                      </div>
                      {rec.url && (
                        <a href={rec.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </a>
                      )}
                    </div>
                  );
                })
              )
            )}

            {type === 'countries' && (
              countries.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No countries yet</p>
              ) : (
                countries.map((country) => (
                  <div key={country.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <span className="text-xl">{country.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{country.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          country.recommendationCount > 0 && `${country.recommendationCount} rec${country.recommendationCount !== 1 ? 's' : ''}`,
                          country.tripCount && country.tripCount > 0 && 'visited'
                        ].filter(Boolean).join(' • ') || 'visited'}
                      </p>
                    </div>
                  </div>
                ))
              )
            )}

            {type === 'cities' && (
              cities.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No cities yet</p>
              ) : (
                cities.map((city) => (
                  <div key={city.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{city.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {city.countryEmoji} {city.countryName}
                        {(city.recommendationCount > 0 || city.tripCount) && ' • '}
                        {[
                          city.recommendationCount > 0 && `${city.recommendationCount} rec${city.recommendationCount !== 1 ? 's' : ''}`,
                          city.tripCount && city.tripCount > 0 && 'visited'
                        ].filter(Boolean).join(', ') || ''}
                      </p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

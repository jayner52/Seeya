import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Star, Globe, Building2, Plane } from 'lucide-react';
import { UserStats } from '@/hooks/useUserStats';
import { ProfileStatsDetailDialog, StatDetailType } from './ProfileStatsDetailDialog';
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

interface ProfileStatsCardProps {
  stats: UserStats | null;
  loading?: boolean;
  trips?: Trip[];
  recommendations?: UserRecommendation[];
  countries?: CountryData[];
  cities?: CityData[];
  userName?: string;
}

export function ProfileStatsCard({ stats, loading, trips = [], recommendations = [], countries = [], cities = [], userName }: ProfileStatsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<StatDetailType | null>(null);

  if (loading) {
    return (
      <Card className="mb-6 animate-pulse">
        <CardContent className="p-6">
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const statItems = [
    { icon: Plane, label: 'Trips', value: stats.tripsCount, color: 'text-blue-500', type: 'trips' as StatDetailType },
    { icon: Star, label: 'Recommendations', value: stats.recommendationsCount, color: 'text-amber-500', type: 'recommendations' as StatDetailType },
    { icon: Globe, label: 'Countries', value: stats.countriesVisited, color: 'text-emerald-500', type: 'countries' as StatDetailType },
    { icon: Building2, label: 'Cities', value: stats.citiesWithRecs, color: 'text-purple-500', type: 'cities' as StatDetailType },
  ];

  const handleStatClick = (type: StatDetailType) => {
    setSelectedType(type);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="mb-6 animate-fade-in overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
            {statItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleStatClick(item.type)}
                className="p-4 sm:p-5 text-center hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
                <p className="font-display text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <ProfileStatsDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={selectedType}
        trips={trips}
        recommendations={recommendations}
        countries={countries}
        cities={cities}
        userName={userName}
      />
    </>
  );
}

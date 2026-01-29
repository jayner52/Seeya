'use client';

import { Card } from '@/components/ui';
import { Plane, Globe, MapPin, Star, Users } from 'lucide-react';

interface ProfileStatsProps {
  tripCount: number;
  countriesVisited: number;
  citiesVisited: number;
  recommendationsCount: number;
  travelPalsCount: number;
  className?: string;
}

interface StatCardProps {
  value: number;
  label: string;
  icon: typeof Plane;
}

function StatCard({ value, label, icon: Icon }: StatCardProps) {
  return (
    <Card variant="outline" padding="md" className="text-center">
      <div className="flex items-center justify-center mb-2">
        <Icon size={20} className="text-seeya-purple" />
      </div>
      <p className="text-2xl font-bold text-seeya-text">{value}</p>
      <p className="text-xs text-seeya-text-secondary">{label}</p>
    </Card>
  );
}

export function ProfileStats({
  tripCount,
  countriesVisited,
  citiesVisited,
  recommendationsCount,
  travelPalsCount,
  className,
}: ProfileStatsProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-5 gap-3">
        <StatCard value={tripCount} label="Trips" icon={Plane} />
        <StatCard value={countriesVisited} label="Countries" icon={Globe} />
        <StatCard value={citiesVisited} label="Cities" icon={MapPin} />
        <StatCard value={recommendationsCount} label="Recs" icon={Star} />
        <StatCard value={travelPalsCount} label="Pals" icon={Users} />
      </div>
    </div>
  );
}

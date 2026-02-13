'use client';

import { Card } from '@/components/ui';
import { Plane, Star, Flag, Building2 } from 'lucide-react';

interface ProfileStatsProps {
  tripCount: number;
  countriesVisited: number;
  citiesVisited: number;
  recommendationsCount: number;
  travelPalsCount?: number;
  className?: string;
}

interface StatItemProps {
  value: number;
  label: string;
  icon: typeof Plane;
}

function StatItem({ value, label, icon: Icon }: StatItemProps) {
  return (
    <div className="flex-1 text-center py-3">
      <Icon size={20} className="text-seeya-purple mx-auto mb-1.5" />
      <p className="text-xl font-bold text-seeya-text">{value}</p>
      <p className="text-xs text-seeya-text-secondary">{label}</p>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-gray-200 self-center" />;
}

export function ProfileStats({
  tripCount,
  countriesVisited,
  citiesVisited,
  recommendationsCount,
  className,
}: ProfileStatsProps) {
  return (
    <div className={className}>
      <Card variant="outline" padding="none">
        <div className="flex items-center">
          <StatItem value={tripCount} label="Trips" icon={Plane} />
          <Divider />
          <StatItem value={recommendationsCount} label="Recs" icon={Star} />
          <Divider />
          <StatItem value={countriesVisited} label="Countries" icon={Flag} />
          <Divider />
          <StatItem value={citiesVisited} label="Cities" icon={Building2} />
        </div>
      </Card>
    </div>
  );
}

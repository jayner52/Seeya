'use client';

import { Card, Button } from '@/components/ui';
import { TravelPalCard } from './TravelPalCard';
import { UserPlus, Users } from 'lucide-react';
import type { Profile } from '@/types/database';
import { getPalColor } from '@/types/calendar';

interface TravelPalWithDetails extends Profile {
  tripCount?: number;
  mutualTrips?: number;
}

interface TravelPalsSectionProps {
  pals: TravelPalWithDetails[];
  onAddClick: () => void;
  onPalClick?: (pal: TravelPalWithDetails) => void;
  className?: string;
}

export function TravelPalsSection({
  pals,
  onAddClick,
  onPalClick,
  className,
}: TravelPalsSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Users size={20} className="text-seeya-purple" />
        <h2 className="text-lg font-semibold text-seeya-text">Travel Pals</h2>
        <span className="text-sm text-seeya-text-secondary">({pals.length})</span>
      </div>

      {pals.length > 0 ? (
        <div className="space-y-3">
          {pals.map((pal, index) => (
            <TravelPalCard
              key={pal.id}
              profile={pal}
              tripCount={pal.tripCount}
              mutualTrips={pal.mutualTrips}
              colorDot={getPalColor(index + 1)}
              onClick={() => onPalClick?.(pal)}
            />
          ))}
        </div>
      ) : (
        <Card variant="outline" padding="lg" className="text-center">
          <Users size={32} className="text-seeya-text-secondary mx-auto mb-3" />
          <h3 className="font-semibold text-seeya-text mb-1">
            No travel pals yet
          </h3>
          <p className="text-sm text-seeya-text-secondary mb-4">
            Add friends to see their trips and travel together
          </p>
          <Button
            variant="purple"
            leftIcon={<UserPlus size={16} />}
            onClick={onAddClick}
          >
            Add Your First Pal
          </Button>
        </Card>
      )}
    </div>
  );
}

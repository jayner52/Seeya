'use client';

import { Card, Button, Avatar } from '@/components/ui';
import { UserPlus, Plane } from 'lucide-react';
import { TravelCircleInfoBox } from './TravelCircleInfoBox';
import type { Profile } from '@/types/database';

interface TripmateWithDetails extends Profile {
  sharedTrips: number;
}

interface TripmatesSectionProps {
  tripmates: TripmateWithDetails[];
  onAddPal: (userId: string) => Promise<void>;
  className?: string;
}

export function TripmatesSection({
  tripmates,
  onAddPal,
  className,
}: TripmatesSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Plane size={20} className="text-seeya-purple" />
        <h2 className="text-lg font-semibold text-seeya-text">Tripmates</h2>
        <span className="text-sm text-seeya-text-secondary">({tripmates.length})</span>
      </div>

      <div className="mb-4">
        <TravelCircleInfoBox />
      </div>

      {tripmates.length === 0 ? (
        <Card variant="outline" padding="md" className="text-center py-8">
          <Plane size={32} className="text-seeya-text-secondary mx-auto mb-2" />
          <p className="font-medium text-seeya-text mb-1">No tripmates found</p>
          <p className="text-sm text-seeya-text-secondary max-w-xs mx-auto">
            When you share trips with people who aren&apos;t your travel pals, they&apos;ll appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tripmates.map((tripmate) => (
            <Card key={tripmate.id} variant="outline" padding="md">
              <div className="flex items-center gap-3">
                <Avatar
                  name={tripmate.full_name}
                  avatarUrl={tripmate.avatar_url}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-seeya-text truncate">
                    {tripmate.full_name}
                  </p>
                  <p className="text-sm text-seeya-text-secondary">
                    {tripmate.sharedTrips} shared {tripmate.sharedTrips === 1 ? 'trip' : 'trips'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<UserPlus size={16} />}
                  onClick={() => onAddPal(tripmate.id)}
                >
                  Add
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

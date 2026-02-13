'use client';

import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui';
import { TrendingUp, MapPin, Users } from 'lucide-react';

interface PopularDestination {
  id: string;
  name: string;
  country: string;
  visitCount: number;
  friendCount: number;
}

interface PopularDestinationsSectionProps {
  destinations: PopularDestination[];
  onDestinationClick?: (destination: PopularDestination) => void;
  className?: string;
}

export function PopularDestinationsSection({
  destinations,
  onDestinationClick,
  className,
}: PopularDestinationsSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-seeya-purple" />
        <h2 className="text-lg font-semibold text-seeya-text">Popular in Your Circle</h2>
      </div>

      {destinations.length === 0 ? (
        <Card variant="outline" padding="md" className="text-center">
          <MapPin size={28} className="text-seeya-text-secondary mx-auto mb-2" />
          <p className="text-sm text-seeya-text-secondary">
            Discover trending destinations
          </p>
          <p className="text-xs text-seeya-text-tertiary mt-1">
            Popular places from your friends' trips will appear here
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {destinations.slice(0, 6).map((dest, index) => (
            <button
              key={dest.id}
              onClick={() => onDestinationClick?.(dest)}
              className="text-left"
            >
              <Card
                variant="outline"
                padding="md"
                className="hover:shadow-sm transition-shadow h-full"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' :
                      'bg-gray-300'
                    )}
                  >
                    {index + 1}
                  </div>
                  <MapPin size={16} className="text-seeya-purple mt-1" />
                </div>
                <h3 className="font-semibold text-seeya-text truncate">
                  {dest.name}
                </h3>
                <p className="text-sm text-seeya-text-secondary truncate">
                  {dest.country}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-seeya-text-tertiary">
                  <Users size={12} />
                  <span>{dest.friendCount} friends visited</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

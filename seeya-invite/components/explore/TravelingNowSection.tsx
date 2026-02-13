'use client';

import Link from 'next/link';
import { Card, Avatar, Button } from '@/components/ui';
import { Plane, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { formatDateRange } from '@/lib/utils/date';

interface TravelingFriend {
  id: string;
  fullName: string;
  avatarUrl?: string;
  tripName: string;
  tripId: string;
  destination?: string;
  startDate: string;
  endDate: string;
  isNow: boolean; // true = traveling now, false = upcoming
}

interface TravelingNowSectionProps {
  friends: TravelingFriend[];
  className?: string;
}

export function TravelingNowSection({ friends, className }: TravelingNowSectionProps) {
  const travelingNow = friends.filter((f) => f.isNow);
  const upcoming = friends.filter((f) => !f.isNow);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Plane size={20} className="text-seeya-purple" />
        <h2 className="text-lg font-semibold text-seeya-text">Your Circle</h2>
      </div>

      {friends.length === 0 ? (
        <Card variant="outline" padding="md" className="text-center">
          <Plane size={28} className="text-seeya-text-secondary mx-auto mb-2" />
          <p className="text-sm text-seeya-text-secondary">
            See where your friends are headed
          </p>
          <p className="text-xs text-seeya-text-tertiary mt-1">
            Add friends to see their upcoming trips
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Traveling Now */}
          {travelingNow.length > 0 && (
            <div>
              <p className="text-xs font-medium text-seeya-success uppercase tracking-wide mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-seeya-success animate-pulse" />
                Traveling Now
              </p>
              <div className="space-y-2">
                {travelingNow.map((friend) => (
                  <FriendTripCard key={friend.id} friend={friend} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-medium text-seeya-text-secondary uppercase tracking-wide mb-2">
                Upcoming
              </p>
              <div className="space-y-2">
                {upcoming.slice(0, 3).map((friend) => (
                  <FriendTripCard key={friend.id} friend={friend} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FriendTripCard({ friend }: { friend: TravelingFriend }) {
  return (
    <Link href={`/trips/${friend.tripId}`}>
      <Card variant="outline" padding="sm" className="hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-3">
          <Avatar
            name={friend.fullName}
            avatarUrl={friend.avatarUrl}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-seeya-text truncate">
              {friend.fullName}
            </p>
            <div className="flex items-center gap-2 text-sm text-seeya-text-secondary">
              {friend.destination && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin size={12} />
                  {friend.destination}
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={16} className="text-seeya-text-secondary flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}

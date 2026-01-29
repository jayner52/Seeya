'use client';

import { Card, Avatar, Button } from '@/components/ui';
import { Sparkles, MapPin, Plus, Check } from 'lucide-react';
import { useState } from 'react';

interface TrendingPlace {
  id: string;
  name: string;
  country: string;
  continent?: string;
  friendsWantToGo: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  }[];
  isInMyWanderlist: boolean;
}

interface TrendingWanderlistSectionProps {
  places: TrendingPlace[];
  onAddToWanderlist: (placeId: string) => Promise<void>;
  className?: string;
}

export function TrendingWanderlistSection({
  places,
  onAddToWanderlist,
  className,
}: TrendingWanderlistSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} className="text-seeya-purple" />
        <h2 className="text-lg font-semibold text-seeya-text">Trending Wanderlist</h2>
      </div>

      {places.length === 0 ? (
        <Card variant="outline" padding="md" className="text-center">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-sm text-seeya-text-secondary">
            See dream destinations
          </p>
          <p className="text-xs text-seeya-text-tertiary mt-1">
            Places your friends want to visit will appear here
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-seeya-text-secondary mb-4">
            Places your friends want to visit
          </p>

          <div className="space-y-3">
            {places.slice(0, 5).map((place) => (
              <TrendingPlaceCard
                key={place.id}
                place={place}
                onAdd={onAddToWanderlist}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TrendingPlaceCard({
  place,
  onAdd,
}: {
  place: TrendingPlace;
  onAdd: (placeId: string) => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(place.isInMyWanderlist);

  const handleAdd = async () => {
    if (isAdded || isAdding) return;
    setIsAdding(true);
    try {
      await onAdd(place.id);
      setIsAdded(true);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card variant="outline" padding="md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center">
          <MapPin size={20} className="text-seeya-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-seeya-text truncate">{place.name}</h3>
          <p className="text-sm text-seeya-text-secondary">{place.country}</p>
        </div>
        <Button
          variant={isAdded ? 'secondary' : 'purple'}
          size="sm"
          onClick={handleAdd}
          disabled={isAdded}
          isLoading={isAdding}
          leftIcon={isAdded ? <Check size={14} /> : <Plus size={14} />}
        >
          {isAdded ? 'Added' : 'Add'}
        </Button>
      </div>

      {/* Friends who want to go */}
      {place.friendsWantToGo.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {place.friendsWantToGo.slice(0, 3).map((friend) => (
                <Avatar
                  key={friend.id}
                  name={friend.fullName}
                  avatarUrl={friend.avatarUrl}
                  size="xs"
                  className="ring-2 ring-white"
                />
              ))}
            </div>
            <span className="text-xs text-seeya-text-secondary">
              {place.friendsWantToGo.length === 1
                ? `${place.friendsWantToGo[0].fullName} wants to go`
                : `${place.friendsWantToGo[0].fullName} and ${
                    place.friendsWantToGo.length - 1
                  } other${place.friendsWantToGo.length > 2 ? 's' : ''} want to go`}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

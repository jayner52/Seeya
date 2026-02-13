'use client';

import { useState } from 'react';
import { Card } from '@/components/ui';
import { ChevronDown, ChevronUp, Users, Plane } from 'lucide-react';

export function TravelCircleInfoBox() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card variant="outline" padding="md" className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-seeya-text">
          What&apos;s the difference?
        </span>
        {isExpanded ? (
          <ChevronUp size={18} className="text-seeya-text-secondary" />
        ) : (
          <ChevronDown size={18} className="text-seeya-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 pt-3 border-t border-seeya-border">
          <div className="flex items-start gap-3">
            <div className="bg-seeya-purple/10 rounded-full p-1.5 mt-0.5">
              <Users size={14} className="text-seeya-purple" />
            </div>
            <div>
              <p className="text-sm font-medium text-seeya-text">Travel Pals</p>
              <p className="text-sm text-seeya-text-secondary">
                Friends you&apos;ve added to your travel circle
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-seeya-purple/10 rounded-full p-1.5 mt-0.5">
              <Plane size={14} className="text-seeya-purple" />
            </div>
            <div>
              <p className="text-sm font-medium text-seeya-text">Tripmates</p>
              <p className="text-sm text-seeya-text-secondary">
                People from your shared trips who aren&apos;t friends yet &mdash; add them to stay connected
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

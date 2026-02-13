'use client';

import { useState } from 'react';
import { Card } from '@/components/ui';
import { ChevronDown, ChevronUp, Info, Users, Plane } from 'lucide-react';

export function TravelCircleInfoBox() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card variant="outline" padding="md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 rounded-full p-1">
            <Info size={14} className="text-blue-500" />
          </div>
          <span className="text-sm font-medium text-seeya-text">
            What&apos;s the difference?
          </span>
        </div>
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
                Friends you&apos;ve added. They can see your trips, calendar, and recommendations.
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
                People from past trips who aren&apos;t friends yet. They can only see shared recommendations from trips you both attended.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

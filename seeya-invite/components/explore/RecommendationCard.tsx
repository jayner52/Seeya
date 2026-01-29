'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, Avatar } from '@/components/ui';
import {
  Star,
  MapPin,
  Bookmark,
  ExternalLink,
  Utensils,
  Ticket,
  Hotel,
  Lightbulb,
} from 'lucide-react';

export interface Recommendation {
  id: string;
  title: string;
  description?: string;
  category: 'restaurant' | 'activity' | 'stay' | 'tip';
  rating?: number;
  tips?: string;
  url?: string;
  cityName?: string;
  countryName?: string;
  latitude?: number;
  longitude?: number;
  createdBy: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  isSaved?: boolean;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onSave?: (id: string) => Promise<void>;
  onUnsave?: (id: string) => Promise<void>;
  onClick?: () => void;
  className?: string;
}

const categoryConfig = {
  restaurant: { icon: Utensils, color: 'bg-orange-50 text-orange-600' },
  activity: { icon: Ticket, color: 'bg-green-50 text-green-600' },
  stay: { icon: Hotel, color: 'bg-purple-50 text-purple-600' },
  tip: { icon: Lightbulb, color: 'bg-blue-50 text-blue-600' },
};

export function RecommendationCard({
  recommendation,
  onSave,
  onUnsave,
  onClick,
  className,
}: RecommendationCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(recommendation.isSaved || false);

  const config = categoryConfig[recommendation.category];
  const Icon = config.icon;

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved && onUnsave) {
        await onUnsave(recommendation.id);
        setIsSaved(false);
      } else if (!isSaved && onSave) {
        await onSave(recommendation.id);
        setIsSaved(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card
      variant="outline"
      padding="none"
      className={cn(
        'overflow-hidden hover:shadow-seeya transition-shadow cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Category header bar */}
      <div className={cn('h-2', config.color.split(' ')[0])} />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.color)}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-seeya-text truncate">
              {recommendation.title}
            </h3>
            {(recommendation.cityName || recommendation.countryName) && (
              <p className="text-sm text-seeya-text-secondary flex items-center gap-1">
                <MapPin size={12} />
                {[recommendation.cityName, recommendation.countryName]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={handleSaveToggle}
            disabled={isSaving}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isSaved
                ? 'text-seeya-purple'
                : 'text-gray-400 hover:text-seeya-purple hover:bg-gray-100'
            )}
          >
            <Bookmark size={18} className={isSaved ? 'fill-current' : ''} />
          </button>
        </div>

        {/* Description */}
        {recommendation.description && (
          <p className="text-sm text-seeya-text-secondary line-clamp-2 mb-3">
            {recommendation.description}
          </p>
        )}

        {/* Rating */}
        {recommendation.rating && (
          <div className="flex items-center gap-1 mb-3">
            <Star size={14} className="text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-seeya-text">
              {recommendation.rating}
            </span>
          </div>
        )}

        {/* Tips */}
        {recommendation.tips && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-seeya-text italic">
              &quot;{recommendation.tips}&quot;
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Avatar
              name={recommendation.createdBy.fullName}
              avatarUrl={recommendation.createdBy.avatarUrl}
              size="xs"
            />
            <span className="text-xs text-seeya-text-secondary">
              {recommendation.createdBy.fullName}
            </span>
          </div>
          {recommendation.url && (
            <a
              href={recommendation.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-seeya-purple hover:underline text-sm flex items-center gap-1"
            >
              <ExternalLink size={12} />
              <span>Link</span>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

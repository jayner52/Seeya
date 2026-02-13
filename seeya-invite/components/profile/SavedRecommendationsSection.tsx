'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { Card, Button, Avatar } from '@/components/ui';
import { Star, MapPin, ExternalLink, Bookmark, BookmarkPlus, ChevronRight } from 'lucide-react';

interface SavedRecommendation {
  id: string;
  title: string;
  description?: string;
  category: string;
  rating?: number;
  cityName?: string;
  countryName?: string;
  createdBy?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

interface SavedRecommendationsSectionProps {
  recommendations: SavedRecommendation[];
  onUnsave: (id: string) => Promise<void>;
  className?: string;
}

const categoryColors: Record<string, string> = {
  restaurant: 'bg-orange-50 text-orange-600',
  activity: 'bg-green-50 text-green-600',
  stay: 'bg-purple-50 text-purple-600',
  tip: 'bg-blue-50 text-blue-600',
};

interface RecommendationCardProps {
  rec: SavedRecommendation;
  onUnsave: () => Promise<void>;
}

function RecommendationCard({ rec, onUnsave }: RecommendationCardProps) {
  const [isUnsaving, setIsUnsaving] = useState(false);

  const handleUnsave = async () => {
    setIsUnsaving(true);
    try {
      await onUnsave();
    } finally {
      setIsUnsaving(false);
    }
  };

  return (
    <Card variant="outline" padding="md" className="group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Category badge */}
          <span
            className={cn(
              'inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2',
              categoryColors[rec.category] || 'bg-gray-50 text-gray-600'
            )}
          >
            {rec.category}
          </span>

          {/* Title */}
          <h4 className="font-semibold text-seeya-text truncate">{rec.title}</h4>

          {/* Location */}
          {(rec.cityName || rec.countryName) && (
            <p className="text-sm text-seeya-text-secondary flex items-center gap-1 mt-0.5">
              <MapPin size={12} />
              {[rec.cityName, rec.countryName].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Rating */}
          {rec.rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={12} className="text-seeya-primary fill-seeya-primary" />
              <span className="text-sm text-seeya-text">{rec.rating}</span>
            </div>
          )}

          {/* From */}
          {rec.createdBy && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <Avatar
                name={rec.createdBy.fullName}
                avatarUrl={rec.createdBy.avatarUrl}
                size="xs"
              />
              <span className="text-xs text-seeya-text-secondary">
                From {rec.createdBy.fullName}
              </span>
            </div>
          )}
        </div>

        {/* Unsave button */}
        <button
          onClick={handleUnsave}
          disabled={isUnsaving}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isUnsaving
              ? 'bg-gray-100'
              : 'hover:bg-gray-100 text-seeya-purple'
          )}
        >
          <Bookmark size={18} className="fill-current" />
        </button>
      </div>
    </Card>
  );
}

export function SavedRecommendationsSection({
  recommendations,
  onUnsave,
  className,
}: SavedRecommendationsSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark size={20} className="text-seeya-purple" />
          <h2 className="text-lg font-semibold text-seeya-text">Saved</h2>
          {recommendations.length > 0 && (
            <span className="text-sm text-seeya-text-secondary">
              ({recommendations.length})
            </span>
          )}
        </div>
        {recommendations.length > 3 && (
          <Link href="/explore?saved=true">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        )}
      </div>

      {recommendations.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {recommendations.slice(0, 4).map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onUnsave={() => onUnsave(rec.id)}
            />
          ))}
        </div>
      ) : (
        <Card variant="outline" padding="lg" className="text-center">
          <BookmarkPlus size={32} className="text-seeya-text-secondary mx-auto mb-3" />
          <h3 className="font-semibold text-seeya-text mb-1">
            No saved recommendations
          </h3>
          <p className="text-sm text-seeya-text-secondary mb-4">
            Save recommendations from Explore to find them here
          </p>
          <Link href="/explore">
            <Button variant="purple" size="sm">
              Explore Now
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Spinner } from '@/components/ui';
import { generateRecommendations, saveRecommendationAsTripBit } from '@/lib/api/recommendations';
import {
  Sparkles,
  Utensils,
  Ticket,
  Hotel,
  Lightbulb,
  Plus,
  Check,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Clock,
} from 'lucide-react';
import type { AIRecommendation, AIRecommendationsResponse, RecommendationCategory } from '@/types';

type FilterCategory = 'all' | RecommendationCategory;

interface AIRecommendationsSectionProps {
  tripId: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  onTripBitAdded?: () => void;
}

const categoryConfig = {
  restaurant: { icon: Utensils, label: 'Food', color: 'bg-orange-50 text-orange-600' },
  activity: { icon: Ticket, label: 'Activities', color: 'bg-green-50 text-green-600' },
  stay: { icon: Hotel, label: 'Stays', color: 'bg-purple-50 text-purple-600' },
  tip: { icon: Lightbulb, label: 'Tips', color: 'bg-blue-50 text-blue-600' },
};

function RecommendationCard({
  recommendation,
  isAdded,
  isAdding,
  onAdd,
}: {
  recommendation: AIRecommendation;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
}) {
  const config = categoryConfig[recommendation.category];
  const Icon = config.icon;

  return (
    <Card variant="outline" padding="none" className="overflow-hidden">
      <div className={cn('h-1.5', config.color.split(' ')[0])} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', config.color)}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-seeya-text">{recommendation.title}</h4>
            <p className="text-sm text-seeya-text-secondary mt-1 line-clamp-2">
              {recommendation.description}
            </p>
          </div>
        </div>

        {/* Cost and time info */}
        <div className="flex flex-wrap gap-3 mb-3">
          {recommendation.estimatedCost && (
            <div className="flex items-center gap-1 text-sm text-seeya-text-secondary">
              <DollarSign size={14} />
              <span>{recommendation.estimatedCost}</span>
            </div>
          )}
          {recommendation.bestTimeToVisit && (
            <div className="flex items-center gap-1 text-sm text-seeya-text-secondary">
              <Clock size={14} />
              <span>{recommendation.bestTimeToVisit}</span>
            </div>
          )}
        </div>

        {/* Tips */}
        {recommendation.tips && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-seeya-text-secondary">
              <Lightbulb size={14} className="inline mr-1 text-yellow-500" />
              {recommendation.tips}
            </p>
          </div>
        )}

        {/* Add button */}
        <button
          onClick={onAdd}
          disabled={isAdded || isAdding}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
            isAdded
              ? 'bg-green-50 text-green-600 cursor-default'
              : 'bg-seeya-purple/10 text-seeya-purple hover:bg-seeya-purple/20'
          )}
        >
          {isAdding ? (
            <Spinner size="sm" />
          ) : isAdded ? (
            <>
              <Check size={16} />
              <span>Added to Trip</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Add to Trip Pack</span>
            </>
          )}
        </button>
      </div>
    </Card>
  );
}

export function AIRecommendationsSection({
  tripId,
  destination,
  startDate,
  endDate,
  onTripBitAdded,
}: AIRecommendationsSectionProps) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendationsResponse | null>(null);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!destination) {
      setError('This trip needs a destination to get recommendations');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const result = await generateRecommendations(
        tripId,
        destination,
        startDate || undefined,
        endDate || undefined
      );
      setRecommendations(result);
      setStatus('success');
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
      setStatus('error');
    }
  };

  const handleAddToTrip = async (recommendation: AIRecommendation) => {
    if (!user || addedIds.has(recommendation.id)) return;

    setAddingId(recommendation.id);

    const result = await saveRecommendationAsTripBit(tripId, user.id, recommendation);

    if (result.success) {
      setAddedIds(prev => new Set([...Array.from(prev), recommendation.id]));
      onTripBitAdded?.();
    } else {
      // Could show a toast here, but for now we'll just log
      console.error('Failed to add recommendation:', result.error);
    }

    setAddingId(null);
  };

  const getAllRecommendations = (): AIRecommendation[] => {
    if (!recommendations) return [];

    if (filter === 'all') {
      return [
        ...recommendations.restaurants,
        ...recommendations.activities,
        ...recommendations.stays,
        ...recommendations.tips,
      ];
    }

    switch (filter) {
      case 'restaurant':
        return recommendations.restaurants;
      case 'activity':
        return recommendations.activities;
      case 'stay':
        return recommendations.stays;
      case 'tip':
        return recommendations.tips;
      default:
        return [];
    }
  };

  const filteredRecommendations = getAllRecommendations();

  // Idle state - show generate button
  if (status === 'idle') {
    return (
      <Card variant="elevated" padding="lg" className="text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-seeya-purple/20 to-purple-200 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-seeya-purple" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-seeya-text mb-1">
              AI Recommendations
            </h3>
            <p className="text-sm text-seeya-text-secondary max-w-sm">
              Get personalized suggestions for restaurants, activities, stays, and tips for your trip
              {destination && ` to ${destination}`}.
            </p>
          </div>
          <Button
            variant="purple"
            onClick={handleGenerate}
            disabled={!destination}
            className="gap-2"
          >
            <Sparkles size={18} />
            Get AI Suggestions
          </Button>
          {!destination && (
            <p className="text-xs text-seeya-text-secondary">
              Add a destination to your trip to get recommendations
            </p>
          )}
        </div>
      </Card>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <Card variant="elevated" padding="lg" className="text-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <div>
            <h3 className="text-lg font-semibold text-seeya-text mb-1">
              Getting recommendations...
            </h3>
            <p className="text-sm text-seeya-text-secondary">
              AI is finding the best spots for {destination}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Card variant="elevated" padding="lg" className="text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-seeya-error" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-seeya-text mb-1">
              Couldn&apos;t get recommendations
            </h3>
            <p className="text-sm text-seeya-text-secondary max-w-sm">
              {error || 'Something went wrong. Please try again.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleGenerate}
            className="gap-2"
          >
            <RefreshCw size={18} />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  // Success state - show recommendations
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-seeya-purple" />
          <h3 className="text-lg font-semibold text-seeya-text">
            AI Recommendations for {destination}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          className="gap-1 text-seeya-text-secondary"
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            filter === 'all'
              ? 'bg-seeya-purple text-white'
              : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
          )}
        >
          All
        </button>
        {(Object.entries(categoryConfig) as [RecommendationCategory, typeof categoryConfig.restaurant][]).map(
          ([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  filter === key
                    ? 'bg-seeya-purple text-white'
                    : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
                )}
              >
                <Icon size={14} />
                {config.label}
              </button>
            );
          }
        )}
      </div>

      {/* Recommendations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            isAdded={addedIds.has(recommendation.id)}
            isAdding={addingId === recommendation.id}
            onAdd={() => handleAddToTrip(recommendation)}
          />
        ))}
      </div>

      {filteredRecommendations.length === 0 && (
        <p className="text-center text-seeya-text-secondary py-8">
          No recommendations in this category
        </p>
      )}
    </div>
  );
}

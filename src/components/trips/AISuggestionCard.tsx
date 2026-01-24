import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, CalendarPlus, Sparkles, Star, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRecommendationCategoryConfig } from '@/lib/recommendationCategoryConfig';

export interface AISuggestion {
  name: string;
  description: string;
  category: 'restaurant' | 'activity' | 'stay' | 'tip';
  rating?: string;
  priceRange?: string;
  url?: string;
}

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onAddToTrip: () => void;
  onAddToItinerary: () => void;
  isAdding?: boolean;
}

export function AISuggestionCard({ suggestion, onAddToTrip, onAddToItinerary, isAdding }: AISuggestionCardProps) {
  const config = getRecommendationCategoryConfig(suggestion.category);
  const Icon = config.icon;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20 hover:border-primary/40 hover:shadow-card transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", config.bgClass)}>
            <Icon className={cn("w-5 h-5", config.textClass)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium text-foreground">{suggestion.name}</h4>
              {suggestion.url && (
                <a
                  href={suggestion.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <Badge variant="secondary" className={cn("text-xs", config.bgClass, config.textClass)}>
                {config.label}
              </Badge>
              {suggestion.rating && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {suggestion.rating}
                </Badge>
              )}
              {suggestion.priceRange && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {suggestion.priceRange}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {suggestion.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-primary">
                <Sparkles className="w-3 h-3" />
                AI Suggestion
              </div>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
                onClick={onAddToTrip}
                disabled={isAdding}
              >
                <Plus className="w-3 h-3" />
                Save to Trip
              </Button>
              <Button
                size="sm"
                className="gap-1 h-7 text-xs"
                onClick={onAddToItinerary}
                disabled={isAdding}
              >
                <CalendarPlus className="w-3 h-3" />
                Add to Itinerary
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

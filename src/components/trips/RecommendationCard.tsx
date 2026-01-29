import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, CalendarPlus } from 'lucide-react';
import { RecommendationData } from '@/hooks/useTrips';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { getRecommendationCategoryConfig } from '@/lib/recommendationCategoryConfig';

interface RecommendationCardProps {
  recommendation: RecommendationData;
  canDelete?: boolean;
  onDelete?: () => void;
  onAddToItinerary?: () => void;
  showAddToItinerary?: boolean;
}

export function RecommendationCard({ recommendation, canDelete, onDelete, onAddToItinerary, showAddToItinerary }: RecommendationCardProps) {
  const config = getRecommendationCategoryConfig(recommendation.category);
  const Icon = config.icon;

  const getInitials = () => {
    if (recommendation.profile?.full_name) {
      return recommendation.profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return recommendation.profile?.username?.slice(0, 2).toUpperCase() || '??';
  };

  return (
    <Card className="bg-card border-border/50 hover:shadow-card transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", config.bgClass)}>
              <Icon className={cn("w-5 h-5", config.textClass)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground truncate">{recommendation.title}</h4>
                <Badge variant="secondary" className={cn("text-xs", config.bgClass, config.textClass)}>
                  {config.label}
                </Badge>
              </div>
              {recommendation.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {recommendation.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={recommendation.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {recommendation.profile?.full_name || recommendation.profile?.username}
                  {' · '}
                  {format(parseISO(recommendation.created_at), 'MMM d')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showAddToItinerary && onAddToItinerary && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary"
                onClick={onAddToItinerary}
                title="Add to itinerary"
              >
                <CalendarPlus className="w-4 h-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

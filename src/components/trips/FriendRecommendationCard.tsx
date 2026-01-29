import { useState } from 'react';
import { Star, ExternalLink, Plus, ChevronDown, Bookmark, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FriendRecommendation } from '@/hooks/useFriendRecommendations';
import { TripWithCountries } from '@/hooks/useUpcomingTripsWithCountries';
import { cn } from '@/lib/utils';
import { getRecommendationCategoryConfig } from '@/lib/recommendationCategoryConfig';

interface FriendRecommendationCardProps {
  recommendation: FriendRecommendation;
  matchingTrips?: TripWithCountries[];
  onAddToTrip?: (tripId: string) => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export function FriendRecommendationCard({ recommendation, matchingTrips = [], onAddToTrip, isSaved, onToggleSave }: FriendRecommendationCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const config = getRecommendationCategoryConfig(recommendation.category);
  const Icon = config.icon;
  
  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const displayName = recommendation.profile.full_name || recommendation.profile.username;
  const hasMatchingTrips = matchingTrips.length > 0;
  
  // Build location string
  const locationParts = [];
  if (recommendation.city?.name) locationParts.push(recommendation.city.name);
  if (recommendation.country?.name) locationParts.push(recommendation.country.name);
  const locationString = locationParts.join(', ');
  
  // Use title, or fallback to location as title
  const displayTitle = recommendation.title?.trim() || locationString || 'Untitled Recommendation';
  const hasRealTitle = !!recommendation.title?.trim();

  const handleCardClick = () => {
    setIsDetailOpen(true);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave?.();
  };

  return (
    <>
      {/* Collapsed Card View */}
      <Card 
        className="group overflow-hidden transition-all hover:shadow-md border-border/50 cursor-pointer"
        onClick={handleCardClick}
      >
        <CardContent className="p-4 relative">
          {/* Country Flag Badge - Top Right */}
          {recommendation.country?.emoji && (
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted/80 flex items-center justify-center text-base border border-border/50 shadow-sm">
              {recommendation.country.emoji}
            </div>
          )}
          
          {/* Title */}
          <h4 className="font-semibold text-foreground mb-1 pr-10">{displayTitle}</h4>
          
          {/* Short Description */}
          {recommendation.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {recommendation.description}
            </p>
          )}
          
          {/* Location - only show if we have a real title */}
          {locationString && hasRealTitle && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <MapPin className="h-3 w-3" />
              <span>{locationString}</span>
            </div>
          )}
          
          {/* Bottom Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {/* Recommender */}
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border border-border/50">
                <AvatarImage src={recommendation.profile.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-muted">
                  {getInitials(recommendation.profile.full_name, recommendation.profile.username)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{displayName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Category Tag */}
              <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full", config.bgClass)}>
                <Icon className={cn("h-3 w-3", config.textClass)} />
                <span className={cn("text-xs font-medium", config.textClass)}>{config.label}</span>
              </div>
              
              {/* Save Button */}
              {onToggleSave && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleSaveClick}
                >
                  <Bookmark className={cn(
                    "w-4 h-4 transition-colors",
                    isSaved ? "fill-current text-foreground" : "text-muted-foreground hover:text-foreground"
                  )} />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{displayTitle}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Rating */}
            {recommendation.rating && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-4 h-4",
                      i < recommendation.rating! 
                        ? "fill-yellow-400 text-yellow-400" 
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
            
            {/* Location */}
            {locationString && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{locationString}</span>
              </div>
            )}
            
            {/* Category Badge */}
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full", config.bgClass)}>
              <Icon className={cn("h-3.5 w-3.5", config.textClass)} />
              <span className={cn("text-xs font-medium", config.textClass)}>{config.label}</span>
            </div>
            
            {/* Full Description */}
            {recommendation.description && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-1">Description</h5>
                <p className="text-sm text-muted-foreground">{recommendation.description}</p>
              </div>
            )}
            
            {/* Notes/Tips */}
            {recommendation.tips && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-1">Notes</h5>
                <div className="bg-muted/50 rounded-lg p-3 border-l-2 border-primary/50">
                  <p className="text-sm text-foreground italic">"{recommendation.tips}"</p>
                </div>
              </div>
            )}
            
            {/* Recommended By */}
            <div className="flex items-center gap-3 pt-2 border-t border-border/50">
              <Avatar className="h-8 w-8 border border-border/50">
                <AvatarImage src={recommendation.profile.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-muted">
                  {getInitials(recommendation.profile.full_name, recommendation.profile.username)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">Recommended by</p>
                <p className="text-sm font-medium text-foreground">{displayName}</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {/* Add to Trip */}
              {hasMatchingTrips && onAddToTrip && (
                matchingTrips.length === 1 ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      onAddToTrip(matchingTrips[0].id);
                      setIsDetailOpen(false);
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to {matchingTrips[0].name.length > 15 
                      ? matchingTrips[0].name.slice(0, 15) + '...' 
                      : matchingTrips[0].name}
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        Add to Trip
                        <ChevronDown className="w-3 h-3 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {matchingTrips.map((trip) => (
                        <DropdownMenuItem 
                          key={trip.id}
                          onClick={() => {
                            onAddToTrip(trip.id);
                            setIsDetailOpen(false);
                          }}
                        >
                          {trip.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              )}
              
              {/* Save Button */}
              {onToggleSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleSave}
                  className="gap-1.5"
                >
                  <Bookmark className={cn(
                    "w-3.5 h-3.5",
                    isSaved ? "fill-current" : ""
                  )} />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              )}
              
              {/* External Link */}
              {recommendation.url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open(recommendation.url!, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

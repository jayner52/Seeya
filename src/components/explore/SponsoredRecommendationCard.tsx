import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star, Bookmark } from 'lucide-react';
import { getRecommendationCategoryConfig, type RecommendationCategory } from '@/lib/recommendationCategoryConfig';
import { cn } from '@/lib/utils';

export interface SponsoredRecommendation {
  id: string;
  title: string;
  description: string;
  tips?: string;
  category: RecommendationCategory;
  countryEmoji: string;
  countryName: string;
  cityName: string;
  rating?: number;
  url?: string;
  sponsorName?: string;
}

interface SponsoredRecommendationCardProps {
  recommendation: SponsoredRecommendation;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export function SponsoredRecommendationCard({ recommendation, isSaved, onToggleSave }: SponsoredRecommendationCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const categoryInfo = getRecommendationCategoryConfig(recommendation.category);
  const CategoryIcon = categoryInfo.icon;
  
  const displayTitle = recommendation.title.length > 30 
    ? recommendation.title.substring(0, 30) + '...' 
    : recommendation.title;

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave?.();
  };

  return (
    <>
      <Card
        className="group overflow-hidden transition-all hover:shadow-md border-amber-300/40 hover:border-amber-400/60 cursor-pointer bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-900/10"
        onClick={() => setIsDetailOpen(true)}
      >
        <CardContent className="p-4 relative">
          {/* Country Flag Badge - Top Right */}
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted/80 flex items-center justify-center text-base border border-border/50 shadow-sm">
            {recommendation.countryEmoji}
          </div>
          
          {/* Title - with padding to avoid flag */}
          <h4 className="font-semibold text-foreground mb-1 pr-10">{displayTitle}</h4>
          
          {/* Short Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {recommendation.description}
          </p>
          
          {/* Location */}
          <p className="text-xs text-muted-foreground mb-3">
            📍 {recommendation.cityName}, {recommendation.countryName}
          </p>
          
          {/* Bottom Bar: Sponsored + Category Pills (left), Bookmark (right) */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full border border-muted-foreground/50 text-muted-foreground">
                Sponsored
              </span>
              <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full", categoryInfo.bgClass)}>
                <CategoryIcon className={cn("h-3 w-3", categoryInfo.textClass)} />
                <span className={cn("text-xs font-medium", categoryInfo.textClass)}>{categoryInfo.label}</span>
              </div>
            </div>
            
            {onToggleSave && (
              <button
                onClick={handleSaveClick}
                className="p-1 rounded hover:bg-muted/50 transition-colors"
              >
                <Bookmark className={cn("w-4 h-4", isSaved ? "fill-current text-foreground" : "text-muted-foreground hover:text-foreground")} />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">{recommendation.title}</DialogTitle>
              <span className="text-lg">{recommendation.countryEmoji}</span>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Rating */}
            {recommendation.rating && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < recommendation.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </div>
            )}
            
            {/* Location */}
            <p className="text-sm text-muted-foreground">
              📍 {recommendation.cityName}, {recommendation.countryName}
            </p>
            
            {/* Category */}
            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full w-fit", categoryInfo.bgClass)}>
              <CategoryIcon className={cn("h-3 w-3", categoryInfo.textClass)} />
              <span className={cn("text-xs font-medium", categoryInfo.textClass)}>{categoryInfo.label}</span>
            </div>
            
            {/* Description */}
            <p className="text-foreground">{recommendation.description}</p>
            
            {/* Tips */}
            {recommendation.tips && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">💡 Pro Tip</p>
                <p className="text-sm text-muted-foreground">{recommendation.tips}</p>
              </div>
            )}
            
            {/* Sponsor Info */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground italic">
                Sponsored content • {recommendation.sponsorName || 'Partner Recommendation'}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              {onToggleSave && (
                <Button
                  variant={isSaved ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={onToggleSave}
                >
                  <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              )}
              {recommendation.url && (
                <Button variant="outline" className="flex-1" asChild>
                  <a href={recommendation.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Learn More
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

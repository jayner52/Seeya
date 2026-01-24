import { useState } from 'react';
import { Star, Share2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useShareRecommendation } from '@/hooks/useFriendRecommendations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RateAndShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripbit: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    url?: string | null;
    trip_id: string;
  };
  cityId: string;
  cityName: string;
}

export function RateAndShareDialog({
  open,
  onOpenChange,
  tripbit,
  cityId,
  cityName,
}: RateAndShareDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [tips, setTips] = useState('');
  const { shareRecommendation, loading } = useShareRecommendation();
  const { toast } = useToast();

  const handleShare = async () => {
    if (rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }

    // Map tripbit category to recommendation category
    const categoryMap: Record<string, 'restaurant' | 'activity' | 'stay' | 'tip'> = {
      accommodation: 'stay',
      activity: 'activity',
      reservation: 'restaurant',
      restaurant: 'restaurant',
      flight: 'tip',
      rental_car: 'tip',
      transportation: 'tip',
      money: 'tip',
      document: 'tip',
      communication: 'tip',
      other: 'tip',
    };

    const recommendationCategory = categoryMap[tripbit.category] || 'tip';

    const { error } = await shareRecommendation({
      cityId,
      title: tripbit.title,
      description: tripbit.description || undefined,
      category: recommendationCategory,
      rating,
      tips: tips.trim() || undefined,
      url: tripbit.url || undefined,
      sourceResourceId: tripbit.id,
      sourceTripId: tripbit.trip_id,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Shared with your travel pals!' });
      onOpenChange(false);
      setRating(0);
      setTips('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Rate & Share
          </DialogTitle>
          <DialogDescription>
            Share "{tripbit.title}" with friends who visit {cityName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Your Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-7 h-7 transition-colors",
                      (hoveredRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Select rating'}
              </span>
            </div>
          </div>

          {/* Tips/Commentary */}
          <div className="space-y-2">
            <Label htmlFor="tips">Tips & Commentary (optional)</Label>
            <Textarea
              id="tips"
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              placeholder="Share your experience, insider tips, or what made this special..."
              className="min-h-[100px] resize-none bg-card"
            />
            <p className="text-xs text-muted-foreground">
              This will be visible to friends planning trips to {cityName}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading || rating === 0}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Share with Pals
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

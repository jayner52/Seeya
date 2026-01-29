import { Crown, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface TripLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCount: number;
  maxTrips: number;
}

export function TripLimitModal({ open, onOpenChange, currentCount, maxTrips }: TripLimitModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
            <Plane className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-xl">Trip Limit Reached</DialogTitle>
          <DialogDescription className="text-center">
            You've reached the maximum of {maxTrips} upcoming trips on the free plan.
            Upgrade to Premium for unlimited trip planning!
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 rounded-lg p-4 my-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Current trips</span>
            <span className="font-semibold">{currentCount} / {maxTrips}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">With Premium, you get:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Unlimited upcoming trips
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> AI-powered travel suggestions
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Calendar view & exports
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Ad-free experience
            </li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
          <Button 
            onClick={() => {
              onOpenChange(false);
              navigate('/pricing');
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium - $4.99/mo
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogPastTripDialog } from './LogPastTripDialog';
import { Map, Plane, Users, Star, ArrowRight, SkipForward } from 'lucide-react';

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingWizard({ open, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState<'welcome' | 'log-trip'>('welcome');
  const [showLogTrip, setShowLogTrip] = useState(false);

  const handleLogTripComplete = () => {
    setShowLogTrip(false);
    onComplete();
  };

  const handleSkipLogTrip = () => {
    setShowLogTrip(false);
    onComplete();
  };

  if (showLogTrip) {
    return (
      <LogPastTripDialog
        open={showLogTrip}
        onOpenChange={(open) => {
          if (!open) handleSkipLogTrip();
        }}
        onComplete={handleLogTripComplete}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" hideCloseButton>
        <DialogHeader className="pb-2">
          <DialogTitle className="font-display text-xl sm:text-2xl text-center">
            Welcome to roamwyth! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Your private travel network for real friends
          </DialogDescription>
        </DialogHeader>

        {step === 'welcome' && (
          <div className="py-2 sm:py-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-8">
              <FeatureCard
                icon={Plane}
                title="Plan Together"
                description="Collaborate on trips with friends"
              />
              <FeatureCard
                icon={Users}
                title="Travel Circle"
                description="See where friends are going"
              />
              <FeatureCard
                icon={Star}
                title="Share Recs"
                description="Save & share your favorites"
              />
              <FeatureCard
                icon={Map}
                title="Track Trips"
                description="Build your travel history"
              />
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-amber-100/50 rounded-xl p-3 sm:p-5 mb-4 sm:mb-6">
              <h3 className="font-display font-semibold text-base sm:text-lg mb-1 sm:mb-2 flex items-center gap-2">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Help friends travel better
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Share a past trip and your favorite recommendations. Your friends will thank you!
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3">
              <Button className="w-full gap-2" onClick={() => setShowLogTrip(true)}>
                Log a Past Trip
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" className="w-full gap-2" onClick={onSkip}>
                <SkipForward className="w-4 h-4" />
                Skip for now
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="text-center p-2 sm:p-4 rounded-lg bg-muted/30">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1 sm:mb-2">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
      </div>
      <h4 className="font-medium text-xs sm:text-sm">{title}</h4>
      <p className="text-[10px] sm:text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

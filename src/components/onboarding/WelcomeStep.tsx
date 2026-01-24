import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plane, MapPin, Star, Users, ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onGetStarted, onSkip }: WelcomeStepProps) {
  return (
    <>
      <DialogHeader className="text-center pb-2">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/30 flex items-center justify-center mb-4">
          <Plane className="w-10 h-10 text-violet-600 dark:text-violet-400" />
        </div>
        <DialogTitle className="font-display text-3xl">Welcome to roamwyth!</DialogTitle>
        <DialogDescription className="text-base">
          Let's set up your travel profile in just a few steps
        </DialogDescription>
      </DialogHeader>

      <div className="py-6 space-y-4">
        <div className="space-y-3">
          <FeatureItem 
            icon={MapPin} 
            title="Track your travels" 
            description="Mark countries you've visited"
            color="bg-slate-800 dark:bg-slate-700 text-white"
          />
          <FeatureItem 
            icon={Star} 
            title="Share recommendations" 
            description="Help travel pals discover great places"
            color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          />
          <FeatureItem 
            icon={Users} 
            title="Connect with travelers" 
            description="See where your travel pals are going"
            color="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
          />
        </div>

        <p className="text-sm text-muted-foreground text-center pt-2">
          This only takes 2 minutes • You can always update later
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" className="w-full gap-2" onClick={onGetStarted}>
          Let's Go
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </>
  );
}

function FeatureItem({ 
  icon: Icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

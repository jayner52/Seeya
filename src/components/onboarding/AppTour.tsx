import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Map, PlusCircle, Users, Compass, Calendar, User,
  ChevronRight, ChevronLeft, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppTourProps {
  onComplete: () => void;
}

const TOUR_STEPS = [
  {
    icon: User,
    title: 'Your Profile',
    description: 'View and edit your profile, photo, and bio. Manage your Wanderlist of dream destinations, see your travel stats, and control your privacy settings.',
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    route: null, // Stay on current page
    targetSelector: '[data-tour="profile"]',
    cardPosition: 'top' as const,
  },
  {
    icon: Users,
    title: 'Your Travel Circle',
    description: 'Build your travel network! Connect with friends to share trips, see where they\'re going, and coordinate travel plans.',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    route: '/friends',
    targetSelector: '[data-tour="nav-circle"]',
    cardPosition: 'top' as const,
  },
  {
    icon: Map,
    title: 'Your Trips',
    description: 'All your trips in one place - upcoming adventures, current travels, and past memories.',
    color: 'bg-primary/10 text-primary',
    route: '/trips',
    targetSelector: '[data-tour="nav-trips"]',
    cardPosition: 'top' as const,
  },
  {
    icon: PlusCircle,
    title: 'Plan a New Trip',
    description: 'Start planning! Create a trip, add destinations, set dates, and invite your travel pals.',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    route: '/trips',
    targetSelector: '[data-tour="new-trip"]',
    cardPosition: 'center' as const,
  },
  {
    icon: Calendar,
    title: 'Trip Calendar',
    description: 'See all your trips on a timeline. Great for spotting gaps and planning around your schedule.',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    route: '/calendar',
    targetSelector: '[data-tour="nav-calendar"]',
    cardPosition: 'top' as const,
  },
  {
    icon: Compass,
    title: 'Explore & Discover',
    description: 'Discover where your friends recommend, trending destinations, and inspiration for your next adventure.',
    color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    route: '/explore',
    targetSelector: '[data-tour="nav-explore"]',
    cardPosition: 'top' as const,
  },
];

export function AppTour({ onComplete }: AppTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  // Navigate and find target element when step changes
  useEffect(() => {
    // Navigate to the route if different (skip if route is null)
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }

    // Find and measure the target element (with delay for navigation/render)
    const findTarget = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    // Initial find after navigation
    const timeout = setTimeout(findTarget, 150);
    
    // Update on resize/scroll
    const handleUpdate = () => findTarget();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [currentStep, step.route, step.targetSelector, navigate, location.pathname]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    // Navigate back to trips before completing
    if (location.pathname !== '/trips') {
      navigate('/trips');
    }
    setTimeout(onComplete, 300);
  };

  const getCardPositionClasses = () => {
    switch (step.cardPosition) {
      case 'top':
        return 'items-start pt-32 sm:pt-40';
      case 'center':
      default:
        return 'items-center';
    }
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex justify-center p-4 transition-all duration-300",
        getCardPositionClasses(),
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Dark backdrop - clicks close tour */}
      <div 
        className="absolute inset-0 transition-all duration-300"
        onClick={handleComplete}
      />

      {/* Pill-shaped spotlight using box-shadow trick */}
      {targetRect && (
        <div 
          className="absolute rounded-full pointer-events-none z-10"
          style={{
            left: targetRect.left - 12,
            top: targetRect.top - 8,
            width: targetRect.width + 24,
            height: targetRect.height + 16,
            border: '2px solid rgb(251, 191, 36)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 0 4px rgba(251, 191, 36, 0.3), 0 0 20px rgba(251, 191, 36, 0.4)',
          }}
        />
      )}

      {/* Fallback dark overlay when no target found */}
      {!targetRect && (
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      )}

      {/* Tour card */}
      <div className={cn(
        "relative w-full max-w-sm bg-card border rounded-2xl shadow-xl overflow-hidden transition-all duration-300 z-20",
        isVisible ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
      )}>
        {/* Progress dots */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {TOUR_STEPS.map((_, idx) => (
            <div 
              key={idx}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                idx === currentStep 
                  ? "w-4 bg-primary" 
                  : idx < currentStep 
                    ? "bg-primary/50" 
                    : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Back button */}
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="absolute top-3 left-3 p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {/* Close button */}
        <button
          onClick={handleComplete}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="pt-12 pb-6 px-6">
          <div className="text-center space-y-4">
            <div className={cn(
              "mx-auto w-16 h-16 rounded-2xl flex items-center justify-center",
              step.color
            )}>
              <Icon className="w-8 h-8" />
            </div>
            
            <div>
              <h3 className="font-display text-xl font-semibold mb-1">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button 
            variant="ghost" 
            className="flex-1"
            onClick={handleComplete}
          >
            Skip tour
          </Button>
          <Button 
            className="flex-1 gap-1"
            onClick={handleNext}
          >
            {currentStep < TOUR_STEPS.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              "Start Exploring"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

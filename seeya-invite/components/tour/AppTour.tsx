'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui';
import {
  Plane,
  Map,
  Sparkles,
  Users,
  CalendarCheck,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: <Plane size={32} className="text-seeya-purple" />,
    title: 'Your Trips',
    description:
      'Create and manage your trips in one place. Add destinations, dates, and invite your travel crew to collaborate on the plan.',
  },
  {
    icon: <Map size={32} className="text-seeya-purple" />,
    title: 'Plan Your Trip',
    description:
      'Add flights, stays, activities, and more as Trip Bits. Organize everything with categories, dates, and details so nothing falls through the cracks.',
  },
  {
    icon: <Sparkles size={32} className="text-seeya-purple" />,
    title: 'AI Recommendations',
    description:
      'Get personalized suggestions for things to do, places to eat, and hidden gems powered by AI. Explore destinations before you even arrive.',
  },
  {
    icon: <Users size={32} className="text-seeya-purple" />,
    title: 'Travel Circle',
    description:
      'Connect with your friends and travel pals. See when they are traveling, share trip details, and coordinate plans together.',
  },
  {
    icon: <CalendarCheck size={32} className="text-seeya-purple" />,
    title: 'Stay Organized',
    description:
      'View your trips on a calendar, export your itinerary, and get notified about upcoming plans. Everything synced and ready to go.',
  },
];

interface AppTourProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function AppTour({ isOpen, onComplete }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    setCurrentStep(0);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Tour Card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Skip button */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 p-1.5 text-seeya-text-secondary hover:text-seeya-text rounded-lg hover:bg-gray-100 transition-colors z-10"
          aria-label="Skip tour"
        >
          <X size={20} />
        </button>

        {/* Icon area */}
        <div className="pt-10 pb-6 flex justify-center bg-gradient-to-b from-purple-50 to-white">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center">
            {step.icon}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-4 text-center">
          <h2 className="text-xl font-display font-semibold text-seeya-text mb-2">
            {step.title}
          </h2>
          <p className="text-seeya-text-secondary text-sm leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 py-4">
          {TOUR_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                index === currentStep
                  ? 'w-6 bg-seeya-purple'
                  : 'bg-gray-300 hover:bg-gray-400'
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between gap-3">
          {isFirst ? (
            <button
              onClick={handleComplete}
              className="text-sm text-seeya-text-secondary hover:text-seeya-text transition-colors"
            >
              Skip tour
            </button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              leftIcon={<ChevronLeft size={16} />}
            >
              Back
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            rightIcon={!isLast ? <ChevronRight size={16} /> : undefined}
          >
            {isLast ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}

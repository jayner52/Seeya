import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TripProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export function TripProgress({ currentStep, totalSteps, steps }: TripProgressProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={step} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-foreground bg-primary/10",
                    !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 text-center hidden sm:block",
                    isCurrent && "text-foreground font-medium",
                    !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors duration-300",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

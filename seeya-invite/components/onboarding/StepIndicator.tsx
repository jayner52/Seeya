'use client';

import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
  className?: string;
}

export function StepIndicator({
  totalSteps,
  currentStep,
  className,
}: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div
            key={index}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all',
              isCompleted && 'bg-seeya-purple',
              isCurrent && 'bg-seeya-purple w-6',
              !isCompleted && !isCurrent && 'bg-gray-200'
            )}
          />
        );
      })}
    </div>
  );
}

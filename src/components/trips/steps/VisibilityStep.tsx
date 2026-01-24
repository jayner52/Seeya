import { visibilityLabels, VisibilityLevel } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Lock, Eye, Calendar, MapPin, Users } from 'lucide-react';

interface VisibilityStepProps {
  visibility: VisibilityLevel;
  onVisibilityChange: (value: VisibilityLevel) => void;
}

const visibilityOptions: { value: VisibilityLevel; icon: React.ElementType }[] = [
  { value: 'only_me', icon: Lock },
  { value: 'busy_only', icon: Calendar },
  { value: 'dates_only', icon: Calendar },
  { value: 'location_only', icon: MapPin },
  { value: 'full_details', icon: Users },
];

export function VisibilityStep({ visibility, onVisibilityChange }: VisibilityStepProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Who can see this trip?
        </h2>
        <p className="text-muted-foreground mt-2">
          Control what your travel circle sees
        </p>
      </div>

      <div className="grid gap-3">
        {visibilityOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = visibility === option.value;
          const label = visibilityLabels[option.value];

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onVisibilityChange(option.value)}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50 bg-card"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium", isSelected && "text-foreground font-semibold")}>
                  {label.label}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {label.description}
                </p>
              </div>
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 transition-colors",
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}
              >
                {isSelected && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

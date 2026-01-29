import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function PremiumBadge({ className, size = 'sm' }: PremiumBadgeProps) {
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
        size === 'sm' ? "text-xs" : "text-sm",
        className
      )}
    >
      <Sparkles className={cn(size === 'sm' ? "w-3 h-3" : "w-4 h-4")} />
      <span className="font-medium">Premium</span>
    </span>
  );
}

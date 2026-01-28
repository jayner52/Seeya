import { cn } from '@/lib/utils/cn';
import { Plane } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const sizes = {
    sm: { icon: 20, text: 'text-lg' },
    md: { icon: 24, text: 'text-xl' },
    lg: { icon: 32, text: 'text-2xl' },
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="bg-gradient-to-br from-seeya-purple to-purple-600 rounded-lg p-1.5">
        <Plane
          size={sizes[size].icon}
          className="text-white"
          strokeWidth={2.5}
        />
      </div>
      {showText && (
        <span
          className={cn(
            'font-display font-semibold text-seeya-text',
            sizes[size].text
          )}
        >
          Seeya
        </span>
      )}
    </div>
  );
}

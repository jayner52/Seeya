import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AvatarGroupProps {
  avatars: { src: string; name: string }[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function AvatarGroup({ avatars, max = 3, size = 'md', className }: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          className={cn(
            sizeClasses[size],
            'border-2 border-card ring-0'
          )}
        >
          <AvatarImage src={avatar.src} alt={avatar.name} />
          <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
            {avatar.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-full border-2 border-card bg-muted flex items-center justify-center font-medium text-muted-foreground'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

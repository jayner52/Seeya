'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'purple' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        'bg-seeya-primary text-seeya-text hover:opacity-90 disabled:bg-gray-300',
      secondary:
        'bg-seeya-secondary text-seeya-text hover:opacity-90',
      purple:
        'bg-seeya-primary text-seeya-text hover:opacity-90',  // Now uses yellow like primary
      ghost: 'text-seeya-text hover:bg-gray-100',
      outline:
        'border border-seeya-border text-seeya-text hover:bg-gray-50 hover:border-gray-300',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-seeya-button',
      md: 'px-4 py-2.5 text-sm rounded-seeya-button',
      lg: 'px-6 py-3 text-base rounded-seeya-button',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-seeya-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

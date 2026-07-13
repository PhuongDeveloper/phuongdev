/* ==========================================================================
   Component Card - Thẻ nội dung với hiệu ứng Glassmorphism
   Variants: glass, solid, outlined
   ========================================================================== */

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/helpers';

type CardVariant = 'glass' | 'solid' | 'outlined';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/** Map class CSS theo variant */
const variantClasses: Record<CardVariant, string> = {
  glass:
    'bg-white/70 backdrop-blur-xl border border-white/20 shadow-lg',
  solid:
    'bg-white border border-slate-200 shadow-sm',
  outlined:
    'bg-transparent border border-slate-200',
};

/** Map class CSS theo padding */
const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'glass',
      hoverable = false,
      padding = 'md',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl overflow-hidden',
          variantClasses[variant],
          paddingClasses[padding],
          hoverable && 'card-hover cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;

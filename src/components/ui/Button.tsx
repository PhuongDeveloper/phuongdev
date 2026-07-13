/* ==========================================================================
   Component Button - Nút bấm tái sử dụng
   Variants: primary, secondary, outline, ghost, danger
   Sizes: sm, md, lg
   ========================================================================== */

'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/helpers';

/** Các kiểu giao diện của nút */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

/** Map class CSS theo variant */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-rose-600 to-red-500 text-white hover:from-rose-700 hover:to-red-600 shadow-md hover:shadow-lg',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
  outline:
    'bg-transparent text-rose-600 border-2 border-rose-600 hover:bg-rose-50',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100',
  danger:
    'bg-red-500 text-white hover:bg-red-600 shadow-md',
};

/** Map class CSS theo kích thước */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3 text-base rounded-xl gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

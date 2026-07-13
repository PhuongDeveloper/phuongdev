/* ==========================================================================
   Component FormInput - Trường nhập liệu có label và trạng thái lỗi
   ========================================================================== */

'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/helpers';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
          {props.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border bg-white text-slate-900',
            'placeholder:text-slate-400 text-sm',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
            error
              ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500'
              : 'border-slate-200 hover:border-slate-300',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-slate-400 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;

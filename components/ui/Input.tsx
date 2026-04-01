'use client'

import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 border rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white placeholder:text-[var(--text-muted)] outline-none transition-all duration-150',
            error
              ? 'border-[var(--red)] focus:border-[var(--red)] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.15)]'
              : 'border-[var(--border-base)] focus:border-[var(--blue)] focus:shadow-[var(--shadow-focus)]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[var(--red)]">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full px-3 py-2 border border-[var(--border-base)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none transition-all duration-150 focus:border-[var(--blue)] focus:shadow-[var(--shadow-focus)]',
            className
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    )
  }
)
Select.displayName = 'Select'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full px-3 py-2 border rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white placeholder:text-[var(--text-muted)] outline-none transition-all duration-150 resize-y',
            error
              ? 'border-[var(--red)] focus:border-[var(--red)]'
              : 'border-[var(--border-base)] focus:border-[var(--blue)] focus:shadow-[var(--shadow-focus)]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[var(--red)]">{error}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

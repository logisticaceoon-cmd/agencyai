'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  icon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--blue)] text-white font-semibold shadow-[0_1px_2px_rgba(37,99,235,0.3)] hover:bg-[#1d4ed8] hover:shadow-[0_2px_4px_rgba(37,99,235,0.4)]',
  secondary:
    'bg-white text-[var(--text-primary)] border border-[var(--border-base)] font-medium hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]',
  danger:
    'bg-[var(--red)] text-white font-semibold hover:bg-[#b91c1c]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, icon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

'use client'

import { cn } from '@/lib/utils'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  green: 'bg-[var(--green-light)] text-[var(--green)]',
  red: 'bg-[var(--red-light)] text-[var(--red)]',
  yellow: 'bg-[var(--yellow-light)] text-[var(--yellow)]',
  blue: 'bg-[var(--blue-light)] text-[var(--blue)]',
  purple: 'bg-[var(--purple-light)] text-[var(--purple)]',
  gray: 'bg-slate-100 text-slate-500',
}

export function Badge({ children, variant = 'gray', className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  )
}

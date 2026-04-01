'use client'

import { deadlineCountdown, isOverdue, cn } from '@/lib/utils'

interface DeadlineCountdownProps {
  deadline: Date | string | null
  className?: string
}

export function DeadlineCountdown({ deadline, className }: DeadlineCountdownProps) {
  if (!deadline) return <span className="text-[var(--text-muted)] text-xs">Sin deadline</span>

  const overdue = isOverdue(deadline)
  const text = deadlineCountdown(deadline)

  return (
    <span
      className={cn(
        'text-xs font-medium',
        overdue ? 'text-[var(--red)]' : 'text-[var(--text-muted)]',
        className
      )}
    >
      {text}
    </span>
  )
}

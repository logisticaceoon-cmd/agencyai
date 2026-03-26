'use client'

import { deadlineCountdown, isOverdue, cn } from '@/lib/utils'

interface DeadlineCountdownProps {
  deadline: Date | string | null
  className?: string
}

export function DeadlineCountdown({ deadline, className }: DeadlineCountdownProps) {
  if (!deadline) return <span className="text-zinc-500 text-xs">Sin deadline</span>

  const overdue = isOverdue(deadline)
  const text = deadlineCountdown(deadline)

  return (
    <span
      className={cn(
        'text-xs font-medium',
        overdue ? 'text-red-400' : 'text-zinc-400',
        className
      )}
    >
      {text}
    </span>
  )
}

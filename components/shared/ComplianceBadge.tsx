'use client'

import { cn } from '@/lib/utils'

interface ComplianceBadgeProps {
  score: number
  className?: string
}

export function ComplianceBadge({ score, className }: ComplianceBadgeProps) {
  const getColor = () => {
    if (score >= 90) return 'text-green-400 bg-green-500/10 border-green-500/30'
    if (score >= 70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    return 'text-red-400 bg-red-500/10 border-red-500/30'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold',
        getColor(),
        className
      )}
    >
      {score}%
    </span>
  )
}

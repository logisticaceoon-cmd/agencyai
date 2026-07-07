import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es })
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function isOverdue(deadline: Date | string | null): boolean {
  if (!deadline) return false
  return isPast(new Date(deadline))
}

export function deadlineCountdown(deadline: Date | string | null): string {
  if (!deadline) return 'Sin deadline'
  const d = new Date(deadline)
  if (isPast(d)) {
    return `Venció hace ${formatDistanceToNow(d, { locale: es })}`
  }
  return `en ${formatDistanceToNow(d, { locale: es })}`
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-green-400 bg-green-500/10 border-green-500/30',
  }
  return colors[priority] || colors.medium
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
    in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    completed: 'text-green-400 bg-green-500/10 border-green-500/30',
    rejected: 'text-red-400 bg-red-500/10 border-red-500/30',
    validated: 'text-green-400 bg-green-500/10 border-green-500/30',
    review: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  }
  return colors[status] || colors.pending
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateWorkload(
  assignedTasks: number
): { percentage: number; status: 'on_track' | 'monitor' | 'overloaded' } {
  const percentage = assignedTasks > 0 ? Math.round((assignedTasks / 10) * 100) : 0
  let status: 'on_track' | 'monitor' | 'overloaded' = 'on_track'
  if (percentage >= 95) status = 'overloaded'
  else if (percentage >= 85) status = 'monitor'
  return { percentage: Math.min(percentage, 100), status }
}

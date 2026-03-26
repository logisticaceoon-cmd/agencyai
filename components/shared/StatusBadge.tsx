'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Task status
  pending: { label: 'Pendiente', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
  in_progress: { label: 'En progreso', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  completed: { label: 'Completada', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  rejected: { label: 'Rechazada', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
  // Validation status
  validated: { label: 'Validado', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  review: { label: 'En revisión', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  // Priority
  critical: { label: 'Crítico', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
  high: { label: 'Alto', className: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  medium: { label: 'Medio', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  low: { label: 'Bajo', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  // Client status
  active: { label: 'Activo', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  paused: { label: 'Pausado', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  inactive: { label: 'Inactivo', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
  // Audit
  draft: { label: 'Borrador', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
  closed: { label: 'Cerrado', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
  compliant: { label: 'Conforme', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  partial: { label: 'Parcial', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  non_compliant: { label: 'No conforme', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
  // Report type
  task_completion: { label: 'Tarea completada', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  change: { label: 'Cambio', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  issue: { label: 'Issue', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
  insight: { label: 'Insight', className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  client_update: { label: 'Update cliente', className: 'bg-teal-500/10 text-teal-400 border-teal-500/30' },
  // Doc status
  published: { label: 'Publicado', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  archived: { label: 'Archivado', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
  // User roles
  CEO: { label: 'CEO', className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  Manager: { label: 'Manager', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  Team: { label: 'Team', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

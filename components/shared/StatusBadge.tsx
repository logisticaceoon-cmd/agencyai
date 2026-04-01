'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Task status
  pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'En progreso', className: 'bg-blue-50 text-blue-600' },
  completed: { label: 'Completada', className: 'bg-emerald-50 text-emerald-600' },
  rejected: { label: 'Rechazada', className: 'bg-red-50 text-red-600' },
  // Validation status
  validated: { label: 'Validado', className: 'bg-emerald-50 text-emerald-600' },
  review: { label: 'En revision', className: 'bg-amber-50 text-amber-600' },
  // Priority
  critical: { label: 'Critico', className: 'bg-red-50 text-red-600' },
  high: { label: 'Alto', className: 'bg-orange-50 text-orange-600' },
  medium: { label: 'Medio', className: 'bg-amber-50 text-amber-600' },
  low: { label: 'Bajo', className: 'bg-emerald-50 text-emerald-600' },
  // Client status
  active: { label: 'Activo', className: 'bg-emerald-50 text-emerald-600' },
  paused: { label: 'Pausado', className: 'bg-amber-50 text-amber-600' },
  inactive: { label: 'Inactivo', className: 'bg-slate-100 text-slate-500' },
  // Audit
  draft: { label: 'Borrador', className: 'bg-slate-100 text-slate-500' },
  closed: { label: 'Cerrado', className: 'bg-slate-100 text-slate-500' },
  compliant: { label: 'Conforme', className: 'bg-emerald-50 text-emerald-600' },
  partial: { label: 'Parcial', className: 'bg-amber-50 text-amber-600' },
  non_compliant: { label: 'No conforme', className: 'bg-red-50 text-red-600' },
  // Report type
  task_completion: { label: 'Tarea completada', className: 'bg-blue-50 text-blue-600' },
  change: { label: 'Cambio', className: 'bg-purple-50 text-purple-600' },
  issue: { label: 'Issue', className: 'bg-red-50 text-red-600' },
  insight: { label: 'Insight', className: 'bg-indigo-50 text-indigo-600' },
  client_update: { label: 'Update cliente', className: 'bg-teal-50 text-teal-600' },
  // Doc status
  published: { label: 'Publicado', className: 'bg-emerald-50 text-emerald-600' },
  archived: { label: 'Archivado', className: 'bg-slate-100 text-slate-500' },
  // User roles
  CEO: { label: 'CEO', className: 'bg-indigo-50 text-indigo-600' },
  Manager: { label: 'Manager', className: 'bg-blue-50 text-blue-600' },
  Team: { label: 'Team', className: 'bg-slate-100 text-slate-500' },
  // Invoice status
  sent: { label: 'Enviada', className: 'bg-blue-50 text-blue-600' },
  paid: { label: 'Pagada', className: 'bg-emerald-50 text-emerald-600' },
  overdue: { label: 'Vencida', className: 'bg-red-50 text-red-600' },
  cancelled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-500' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-500' }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

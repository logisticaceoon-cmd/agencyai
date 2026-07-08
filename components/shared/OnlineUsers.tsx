'use client'

import { useState } from 'react'
import { usePresence, type PresenceUser } from '@/hooks/usePresence'
import { cn } from '@/lib/utils'

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-teal-500',
]

function getColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clientes',
  '/projects': 'Proyectos',
  '/tasks': 'Tareas',
  '/finances': 'Finanzas',
  '/kpis': 'KPIs',
  '/reports': 'Reportes',
  '/settings': 'Configuracion',
}

function getPageLabel(page: string): string {
  return PAGE_LABELS[page] || page
}

interface OnlineUsersProps {
  page?: string
  className?: string
}

export function OnlineUsers({ page = '/dashboard', className }: OnlineUsersProps) {
  const { onlineUsers, count } = usePresence(page)
  const [showTooltip, setShowTooltip] = useState(false)

  if (count === 0) return null

  const maxVisible = 3
  const visibleUsers = onlineUsers.slice(0, maxVisible)
  const remainingCount = count - maxVisible

  return (
    <div
      className={cn('relative flex items-center gap-2', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Avatares apilados */}
      <div className="flex -space-x-1.5">
        {visibleUsers.map((user) => (
          <div
            key={user.userId}
            className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ring-2 ring-white',
              user.avatarUrl ? '' : getColor(user.fullName)
            )}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              getInitials(user.fullName)
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white bg-gray-400 ring-2 ring-white">
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Indicador de punto verde + texto */}
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
          {count} en linea
        </span>
      </div>

      {/* Tooltip con lista de usuarios */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 z-50 w-56 rounded-lg border border-[var(--border-base)] bg-white shadow-lg py-2">
          <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Usuarios en linea
          </div>
          {onlineUsers.map((user) => (
            <UserRow key={user.userId} user={user} />
          ))}
        </div>
      )}
    </div>
  )
}

function UserRow({ user }: { user: PresenceUser }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-subtle)]">
      <div
        className={cn(
          'h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0',
          user.avatarUrl ? '' : getColor(user.fullName)
        )}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          getInitials(user.fullName)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
          {user.fullName}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] truncate">
          {getPageLabel(user.currentPage)}
        </p>
      </div>
      <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
    </div>
  )
}

'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Avatar } from '@/components/shared/Avatar'
import { timeAgo, cn } from '@/lib/utils'

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clientes',
  '/projects': 'Proyectos',
  '/tasks': 'Tareas',
  '/minutes': 'Minutas',
  '/calendar': 'Calendario',
  '/reports': 'Reportes',
  '/kpis': 'KPIs y Metricas',
  '/objectives': 'Objetivos',
  '/audits': 'Auditorias',
  '/docs': 'Documentos',
  '/finances': 'Finanzas',
  '/recordings': 'Grabaciones',
  '/alerts': 'IA & Alertas',
  '/settings': 'Configuracion',
  '/settings/team': 'Equipo',
  '/settings/billing': 'Facturacion',
  '/settings/account': 'Mi cuenta',
  '/settings/workspace': 'Workspace',
  '/notifications': 'Notificaciones',
}

function getBreadcrumb(pathname: string): string {
  if (BREADCRUMB_MAP[pathname]) return BREADCRUMB_MAP[pathname]
  // Check parent paths
  const segments = pathname.split('/')
  while (segments.length > 1) {
    segments.pop()
    const parent = segments.join('/') || '/'
    if (BREADCRUMB_MAP[parent]) return BREADCRUMB_MAP[parent]
  }
  return 'Dashboard'
}

export function Header() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { user } = useCurrentUser()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const breadcrumb = getBreadcrumb(pathname)

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border-base)] bg-white px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{breadcrumb}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors rounded-lg hover:bg-[var(--bg-muted)]"
            aria-label="Notificaciones"
          >
            <Bell size={16} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[var(--blue)] text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 w-80 rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white shadow-lg animate-scale-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-base)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => { markAllAsRead() }}
                      className="text-xs text-[var(--blue)] hover:text-[#1d4ed8] font-medium"
                    >
                      Marcar todas como leidas
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                      No tenes notificaciones
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => {
                      const href = n.relatedEntityType && n.relatedEntityId
                        ? `/${n.relatedEntityType}s/${n.relatedEntityId}`
                        : '#'
                      return (
                        <Link
                          key={n.id}
                          href={href}
                          onClick={() => { markAsRead(n.id); setOpen(false) }}
                          className={cn(
                            'flex gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors border-b border-[var(--bg-muted)] last:border-0',
                            !n.isRead && 'bg-[var(--blue-light)]'
                          )}
                        >
                          {!n.isRead && (
                            <div className="mt-1.5 h-2 w-2 rounded-full bg-[var(--blue)] flex-shrink-0" />
                          )}
                          {n.isRead && <div className="mt-1.5 h-2 w-2 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{n.title}</p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">{n.message}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{n.createdAt ? timeAgo(n.createdAt) : ''}</p>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User avatar */}
        {user && (
          <Link href="/settings/account" className="flex-shrink-0" aria-label="Mi cuenta">
            <Avatar name={user.fullName || 'U'} avatarUrl={user.avatarUrl} size="sm" />
          </Link>
        )}
      </div>
    </header>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { timeAgo, cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, string> = {
  warning: '⚠️',
  success: '✅',
  info: 'ℹ️',
  milestone: '🎯',
  TASK: '✅',
  REPORT: '📊',
  ALERT: '⚠️',
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)

  function getNotifLink(n: { relatedEntityType?: string | null; relatedEntityId?: string | null }) {
    if (n.relatedEntityType && n.relatedEntityId) {
      return `/${n.relatedEntityType}s/${n.relatedEntityId}`
    }
    return '#'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
        aria-label="Centro de notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-96 rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Notificaciones</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Marcar todas como leidas
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No tenes notificaciones</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => {
                  const href = getNotifLink(n as unknown as { relatedEntityType?: string; relatedEntityId?: string })
                  const nType = (n as unknown as { type?: string }).type || 'info'
                  return (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={() => { markAsRead(n.id); setOpen(false) }}
                      className={cn(
                        'flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0',
                        !n.isRead && 'bg-blue-50/50'
                      )}
                    >
                      <span className="text-base flex-shrink-0 mt-0.5">
                        {TYPE_ICONS[nType] || 'ℹ️'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-medium text-slate-900 flex-1">{n.title}</p>
                          {!n.isRead && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{n.createdAt ? timeAgo(n.createdAt) : ''}</p>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>

            <div className="border-t border-slate-100 p-2">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-medium text-blue-600 hover:text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Ver todas las notificaciones
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { useNotifications } from '@/hooks/useNotifications'
import { timeAgo, cn } from '@/lib/utils'

export function Header() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-[#111111] px-6">
      <div className="flex-1" />

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-20 w-80 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-white">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => { markAllAsRead() }}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    No tenés notificaciones
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
                          'flex gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0',
                          !n.isRead && 'bg-indigo-600/5'
                        )}
                      >
                        {!n.isRead && (
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        )}
                        {n.isRead && <div className="mt-1.5 h-2 w-2 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="text-xs text-zinc-400 truncate">{n.message}</p>
                          <p className="text-xs text-zinc-600 mt-0.5">{timeAgo(n.createdAt)}</p>
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
    </header>
  )
}

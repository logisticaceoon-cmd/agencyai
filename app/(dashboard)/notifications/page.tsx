'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'

interface Notification {
  id: string; title: string; message: string; type: string
  isRead: boolean; link: string | null; createdAt: string
}

const TYPE_ICONS: Record<string, string> = { warning: '⚠️', success: '✅', info: 'ℹ️', milestone: '🎯' }

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (filter) params.set('filter', filter)
    const res = await fetch(`/api/notifications?${params}`)
    if (res.ok) {
      const j = await res.json()
      setNotifications(j.notifications || [])
      setTotal(j.total || 0)
    }
    setLoading(false)
  }, [page, filter])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  async function markAllAsRead() {
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificaciones</h1>
          <p className="mt-1 text-sm text-slate-500">{total} notificaciones en total</p>
        </div>
        <button onClick={markAllAsRead} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Check className="h-4 w-4" /> Marcar todas como leidas
        </button>
      </div>

      <div className="flex items-center gap-2">
        {[{ value: '', label: 'Todas' }, { value: 'unread', label: 'No leidas' }, { value: 'warning', label: 'Warnings' }, { value: 'info', label: 'Info' }].map(f => (
          <button key={f.value} onClick={() => { setFilter(f.value); setPage(1) }} className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            filter === f.value ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          )}>{f.label}</button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No hay notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map(n => (
              <Link key={n.id} href={n.link || '#'} onClick={() => !n.isRead && markAsRead(n.id)} className={cn(
                'flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors',
                !n.isRead && 'bg-blue-50/40'
              )}>
                <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || 'ℹ️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium text-slate-900 flex-1">{n.title}</p>
                    {!n.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 disabled:opacity-50">Anterior</button>
          <span className="text-xs text-slate-500">Pagina {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 disabled:opacity-50">Siguiente</button>
        </div>
      )}
    </div>
  )
}

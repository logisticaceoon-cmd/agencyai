'use client'

import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '@/store/notifications'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { Notification } from '@/types'

// Tipo que viene de Supabase (snake_case)
interface NotificationRow { [key: string]: unknown;
  id: string
  user_id: string
  workspace_id: string
  title: string
  message?: string | null
  type?: string
  read?: boolean
  is_read?: boolean
  link?: string | null
  related_entity_type?: string | null
  related_entity_id?: string | null
  created_at?: string
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type as Notification['type'],
    isRead: row.is_read ?? row.read ?? false,
    read: row.is_read ?? row.read ?? false,
    link: row.link,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    createdAt: row.created_at,
    created_at: row.created_at,
  }
}

export function useRealtimeNotifications() {
  const {
    notifications,
    unreadCount,
    setNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore()
  const { org } = useCurrentUser()

  // Cargar notificaciones iniciales
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error)
    }
  }, [setNotifications])

  // Suscripcion en tiempo real a la tabla notifications
  useRealtimeSubscription<NotificationRow>({
    table: 'notifications',
    filter: org ? { column: 'workspace_id', value: org.id } : undefined,
    enabled: !!org,
    onInsert: (payload) => {
      const notification = rowToNotification(payload)
      addNotification(notification)

      // Mostrar notificacion del navegador si esta permitido
      if (typeof window !== 'undefined' && Notification.permission === 'granted') {
        new window.Notification(notification.title, {
          body: notification.message || '',
          icon: '/icon-192.png',
        })
      }
    },
    onUpdate: (payload) => {
      const notification = rowToNotification(payload)
      // Si se marco como leida, actualizar en el store
      if (notification.isRead) {
        markAsRead(notification.id)
      }
    },
  })

  // Cargar al montar
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Marcar como leida con optimistic update
  const handleMarkAsRead = useCallback(
    async (id: string) => {
      const prev = notifications
      markAsRead(id)
      try {
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      } catch {
        setNotifications(prev)
      }
    },
    [markAsRead, notifications, setNotifications]
  )

  // Marcar todas como leidas
  const handleMarkAllAsRead = useCallback(async () => {
    const prev = notifications
    markAllAsRead()
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
    } catch {
      setNotifications(prev)
    }
  }, [markAllAsRead, notifications, setNotifications])

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  }
}

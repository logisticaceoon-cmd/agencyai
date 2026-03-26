'use client'

import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '@/store/notifications'

export function useNotifications() {
  const { notifications, unreadCount, setNotifications, addNotification, markAsRead, markAllAsRead } =
    useNotificationStore()

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [setNotifications])

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      markAsRead(id)
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    },
    [markAsRead]
  )

  const handleMarkAllAsRead = useCallback(async () => {
    markAllAsRead()
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
  }, [markAllAsRead])

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  }
}

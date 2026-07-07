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

  const handleMarkAllAsRead = useCallback(async () => {
    const prev = notifications
    markAllAsRead()
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
    } catch {
      setNotifications(prev)
    }
  }, [markAllAsRead, notifications, setNotifications])

  useEffect(() => {
    fetchNotifications()
    // Poll every 90 seconds
    const interval = setInterval(fetchNotifications, 90000)
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

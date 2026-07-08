'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface PresenceUser {
  userId: string
  fullName: string
  avatarUrl?: string | null
  currentPage: string
  entityType?: string
  entityId?: string
  lastSeen: string
}

interface PresenceState {
  [key: string]: PresenceUser[]
}

export function usePresence(page: string, entityType?: string, entityId?: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const { user } = useCurrentUser()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reportar presencia al API
  const reportPresence = useCallback(async () => {
    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_page: page,
          entity_type: entityType,
          entity_id: entityId,
        }),
      })
    } catch {
      // Silenciar errores de presencia
    }
  }, [page, entityType, entityId])

  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    const channelName = `presence-workspace`

    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState
        const users: PresenceUser[] = []
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            // No incluir al usuario actual
            if (p.userId !== user.id) {
              users.push(p)
            }
          })
        })
        setOnlineUsers(users)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            currentPage: page,
            entityType,
            entityId,
            lastSeen: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    // Reportar presencia al API al montar
    reportPresence()

    // Actualizar presencia cada 30 segundos
    intervalRef.current = setInterval(() => {
      reportPresence()
      // Tambien actualizar el track del canal
      channel.track({
        userId: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        currentPage: page,
        entityType,
        entityId,
        lastSeen: new Date().toISOString(),
      })
    }, 30000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      channel.unsubscribe()
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, page, entityType, entityId])

  return {
    onlineUsers,
    count: onlineUsers.length,
  }
}

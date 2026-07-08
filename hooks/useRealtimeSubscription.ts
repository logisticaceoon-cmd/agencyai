'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseRealtimeSubscriptionOptions<T> {
  table: string
  filter?: { column: string; value: string }
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T) => void
  onDelete?: (payload: T) => void
  enabled?: boolean
}

export function useRealtimeSubscription<T extends Record<string, unknown>>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeSubscriptionOptions<T>) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected')
      return
    }

    const supabase = createClient()
    setStatus('connecting')

    const channelName = filter
      ? `realtime-${table}-${filter.column}-${filter.value}`
      : `realtime-${table}`

    // Construir el filtro de postgres_changes
    const pgFilter: Record<string, string> = {
      event: '*',
      schema: 'public',
      table,
    }
    if (filter) {
      pgFilter.filter = `${filter.column}=eq.${filter.value}`
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as never,
        pgFilter,
        (payload: RealtimePostgresChangesPayload<T>) => {
          const record = (payload.new || payload.old) as T
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(record)
              break
            case 'UPDATE':
              onUpdate?.(record)
              break
            case 'DELETE':
              onDelete?.((payload.old as T) || record)
              break
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (status === 'CLOSED') {
          setStatus('disconnected')
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('error')
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      setStatus('disconnected')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter?.column, filter?.value, enabled])

  return { status }
}

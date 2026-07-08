'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export interface RealtimeTask { [key: string]: unknown;
  id: string
  workspace_id: string
  title: string
  description?: string | null
  status: string
  priority?: string
  due_date?: string | null
  assigned_to?: string | null
  client_id?: string | null
  project_id?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export function useRealtimeTasks() {
  const [tasks, setTasks] = useState<RealtimeTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { org } = useCurrentUser()

  // Cargar tareas iniciales
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || data || [])
      }
    } catch (error) {
      console.error('Error al cargar tareas:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Suscripcion en tiempo real
  const { status } = useRealtimeSubscription<RealtimeTask>({
    table: 'tasks',
    filter: org ? { column: 'workspace_id', value: org.id } : undefined,
    enabled: !!org,
    onInsert: (task) => {
      // Solo agregar si no fue eliminada (soft delete)
      if (!task.deleted_at) {
        setTasks((prev) => {
          // Evitar duplicados
          if (prev.some((t) => t.id === task.id)) return prev
          return [task, ...prev]
        })
      }
    },
    onUpdate: (task) => {
      setTasks((prev) => {
        // Si fue eliminada (soft delete), remover de la lista
        if (task.deleted_at) {
          return prev.filter((t) => t.id !== task.id)
        }
        // Actualizar la tarea existente
        const exists = prev.some((t) => t.id === task.id)
        if (exists) {
          return prev.map((t) => (t.id === task.id ? task : t))
        }
        // Si no existe y no fue eliminada, agregar
        return [task, ...prev]
      })
    },
    onDelete: (task) => {
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    },
  })

  return {
    tasks,
    isLoading,
    isConnected: status === 'connected',
    refetch: fetchTasks,
  }
}

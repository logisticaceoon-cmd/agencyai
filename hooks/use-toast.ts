'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

type ToastState = Toast[]

let state: ToastState = []
const listeners = new Set<(toasts: ToastState) => void>()

function setState(newState: ToastState) {
  state = newState
  listeners.forEach((l) => l(state))
}

export function toast(options: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substr(2, 9)
  const newToast: Toast = { id, ...options }
  setState([...state, newToast])
  setTimeout(() => {
    setState(state.filter((t) => t.id !== id))
  }, 4000)
  return id
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState>(state)

  useEffect(() => {
    const listener = (newState: ToastState) => setToasts([...newState])
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const dismiss = useCallback((id: string) => {
    setState(state.filter((t) => t.id !== id))
  }, [])

  return { toasts, dismiss, toast }
}

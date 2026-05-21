'use client'

import { useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'
import { CheckSquare, Plus, MessageSquare, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface DashboardAgentProps {
  stats: {
    tasksOverdue: number
    pendingTasks: Array<{ id: string; title: string; deadline: string; project: { name: string } | null }>
  } | null
}

export function DashboardAgent({ stats }: DashboardAgentProps) {
  const { user } = useCurrentUser()
  const [greeting, setGreeting] = useState('')
  const [loading, setLoading] = useState(true)
  const [agentName, setAgentName] = useState('Asistente AgencyAI')
  const [agentAvatar, setAgentAvatar] = useState('🤖')
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Load agent config
  useEffect(() => {
    fetch('/api/ai/config')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setAgentName(d.data.agent_name || 'Ceonyx')
          setAgentAvatar(d.data.agent_avatar || '🤖')
        }
      })
      .catch(() => {})
  }, [])

  // Fetch greeting
  useEffect(() => {
    if (!user || !stats) return

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    const overdueTasks = (stats.pendingTasks || [])
      .filter(t => t.deadline && t.deadline.slice(0, 10) < todayStr)
      .map(t => ({ title: t.title, dueDate: t.deadline?.slice(0, 10) || '' }))

    const todayTasks = (stats.pendingTasks || [])
      .filter(t => t.deadline && t.deadline.slice(0, 10) === todayStr)
      .map(t => ({ title: t.title, project: t.project?.name || '' }))

    fetch('/api/ai/dashboard-greeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: user.fullName?.split(' ')[0] || 'Usuario',
        hour: now.getHours(),
        overdueTasks,
        todayTasks,
        activeProjects: 0,
        agentName,
        agentPersonality: 'profesional',
      }),
    })
      .then(r => r.json())
      .then(d => {
        setGreeting(d.greeting || '')
        setLoading(false)
      })
      .catch(() => {
        setGreeting('Hola! Estoy listo para ayudarte con tu dia.')
        setLoading(false)
      })
  }, [user, stats, agentName])

  // Typewriter effect
  useEffect(() => {
    if (!greeting || loading) return
    setIsTyping(true)
    setDisplayedText('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayedText(greeting.slice(0, i))
      if (i >= greeting.length) {
        clearInterval(interval)
        setIsTyping(false)
      }
    }, 15)
    return () => clearInterval(interval)
  }, [greeting, loading])

  function openAgentWidget() {
    // Dispatch custom event to open the agent widget
    window.dispatchEvent(new CustomEvent('open-agent-widget'))
  }

  return (
    <div
      className="rounded-2xl border border-blue-200 p-6 animate-fade-in"
      style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 60%)' }}
    >
      <div className="flex items-start gap-5">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
            {agentAvatar}
          </div>
          <span className="text-xs font-semibold text-[var(--text-primary)] text-center leading-tight max-w-[80px] truncate">
            {agentName}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            IA Activa
          </span>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-2.5">
              <div className="h-3.5 w-4/5 bg-blue-100 rounded animate-pulse" />
              <div className="h-3.5 w-3/5 bg-blue-100 rounded animate-pulse" />
              <div className="h-3.5 w-2/5 bg-blue-100 rounded animate-pulse" />
            </div>
          ) : (
            <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {displayedText}
              {isTyping && <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-text-bottom" />}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-white text-xs font-medium text-[var(--text-secondary)] hover:border-blue-300 hover:text-blue-600 transition-all"
          >
            <CheckSquare size={12} strokeWidth={1.5} />
            Tareas urgentes
          </Link>
          <Link
            href="/tasks/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-base)] bg-white text-xs font-medium text-[var(--text-secondary)] hover:border-blue-300 hover:text-blue-600 transition-all"
          >
            <Plus size={12} strokeWidth={1.5} />
            Crear tarea
          </Link>
          <button
            onClick={openAgentWidget}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <MessageSquare size={12} strokeWidth={1.5} />
            Hablar con agente
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Settings, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import Link from 'next/link'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
}

const QUICK_CHIPS = [
  'Que tareas tengo hoy?',
  'Analisis completo',
  'Crear tarea',
  'Ver proyectos en riesgo',
  'Generar reporte',
  'Como estoy este mes?',
]

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function getTimeStr() {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function getTodayLabel() {
  const now = new Date()
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `Hoy, ${now.getDate()} de ${months[now.getMonth()]}`
}

export function AgentChat() {
  const { user, org } = useCurrentUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentName, setAgentName] = useState('Asistente AgencyAI')
  const [agentAvatar, setAgentAvatar] = useState('🤖')
  const [hasAI, setHasAI] = useState<boolean | null>(null)
  const [greeted, setGreeted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Load agent config
  useEffect(() => {
    fetch('/api/ai/config')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setAgentName(d.data.agent_name || 'Asistente AgencyAI')
          setAgentAvatar(d.data.agent_avatar || '🤖')
        }
      })
      .catch(() => {})
  }, [])

  // Auto-greeting on mount
  useEffect(() => {
    if (!user || greeted) return

    const today = new Date().toDateString()
    const key = `greeting_${org?.id || 'default'}`
    const last = localStorage.getItem(key)

    if (last === today) {
      setGreeted(true)
      return
    }

    setGreeted(true)
    localStorage.setItem(key, today)

    // Send system greeting
    sendToApi('[SISTEMA: Saludo inicial del dia. El usuario acaba de abrir el dashboard.]', true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, greeted])

  const sendToApi = useCallback(async (text: string, isSystem = false) => {
    if (loading) return

    const userMsg: ChatMessage | null = isSystem ? null : {
      id: generateId(),
      role: 'user',
      content: text,
      time: getTimeStr(),
    }

    const updatedMessages = userMsg ? [...messages, userMsg] : [...messages]
    if (userMsg) setMessages(updatedMessages)
    setLoading(true)

    try {
      const apiMessages = isSystem
        ? [{ role: 'user' as const, content: text }]
        : updatedMessages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          message: text,
          module: 'dashboard',
          context: {},
        }),
      })

      const data = await res.json()
      setHasAI(data.hasAI ?? null)

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.response || 'No pude procesar tu mensaje.',
        time: getTimeStr(),
      }
      setMessages(prev => [...prev, assistantMsg])

      // Execute action if present
      if (data.action) {
        await executeAction(data.action)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'Error de conexion. Intenta de nuevo.',
        time: getTimeStr(),
      }])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading])

  async function executeAction(action: { type: string; data: any }) {
    try {
      if (action.type === 'create_task') {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: action.data.title,
            priority: action.data.priority || 'medium',
            deadline: action.data.dueDate || undefined,
            description: action.data.description || '',
            status: 'pending',
            assignedTo: user ? [user.id] : [],
          }),
        })
        if (res.ok) {
          setMessages(prev => [...prev, {
            id: generateId(), role: 'assistant',
            content: `Tarea "${action.data.title}" creada en tu tablero.`,
            time: getTimeStr(),
          }])
        }
      } else if (action.type === 'complete_task') {
        await fetch(`/api/tasks/${action.data.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', progressPercent: 100 }),
        })
        setMessages(prev => [...prev, {
          id: generateId(), role: 'assistant',
          content: 'Tarea marcada como completada.',
          time: getTimeStr(),
        }])
      } else if (action.type === 'create_report') {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: action.data.title || 'Reporte generado por IA',
            type: action.data.type || 'client_update',
            content: action.data.content || '',
          }),
        })
        if (res.ok) {
          setMessages(prev => [...prev, {
            id: generateId(), role: 'assistant',
            content: 'Reporte creado. Podes verlo en la seccion Reportes.',
            time: getTimeStr(),
          }])
        }
      }
    } catch {
      // silently fail action execution
    }
  }

  function handleSend() {
    if (!input.trim() || loading) return
    sendToApi(input.trim())
    setInput('')
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleChip(text: string) {
    sendToApi(text)
  }

  const showChips = messages.length === 0 || (messages.length <= 1 && messages[0]?.role === 'assistant')

  return (
    <div className="flex flex-col h-full bg-white rounded-[var(--radius-lg)] border border-[var(--border-base)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-base)] bg-white flex-shrink-0">
        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-lg flex-shrink-0">
          {agentAvatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{agentName}</p>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              hasAI === false ? 'bg-slate-400' : 'bg-emerald-500'
            )} />
            <span className="text-[10px] text-[var(--text-muted)]">
              {hasAI === false ? 'Sin IA' : 'En linea'}
            </span>
          </div>
        </div>
        <Link href="/alerts" className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors" title="Configurar agente">
          <Settings size={14} strokeWidth={1.5} />
        </Link>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#f0f2f5' }}>
        {/* Date divider */}
        <div className="flex items-center justify-center">
          <span className="px-3 py-1 rounded-full bg-white/80 text-[11px] text-[var(--text-muted)] font-medium shadow-sm">
            {getTodayLabel()}
          </span>
        </div>

        {/* No AI banner */}
        {hasAI === false && messages.length <= 1 && (
          <div className="mx-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="text-xs font-semibold text-amber-800 mb-1">IA no configurada</p>
            <p className="text-[11px] text-amber-700 mb-2">Configura tu API key para activar las respuestas inteligentes</p>
            <Link href="/alerts" className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-900 transition-colors">
              Ir a configurar <ArrowRight size={11} />
            </Link>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const showAvatar = !isUser && (i === 0 || messages[i - 1]?.role === 'user')

          return (
            <div key={msg.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
              {/* Agent avatar */}
              {!isUser && (
                <div className="w-7 flex-shrink-0 mr-1.5">
                  {showAvatar && (
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">
                      {agentAvatar}
                    </div>
                  )}
                </div>
              )}

              <div className={cn('max-w-[80%]')}>
                <div
                  className={cn(
                    'px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap',
                    isUser
                      ? 'bg-[var(--blue)] text-white rounded-2xl rounded-br-md'
                      : 'bg-white text-[var(--text-primary)] rounded-2xl rounded-bl-md shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  )}
                >
                  {msg.content}
                </div>
                <p className={cn(
                  'text-[10px] mt-0.5 px-1',
                  isUser ? 'text-right text-[var(--text-muted)]' : 'text-[var(--text-muted)]'
                )}>
                  {msg.time}
                </p>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 flex-shrink-0 mr-1.5">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">
                {agentAvatar}
              </div>
            </div>
            <div className="bg-white rounded-2xl rounded-bl-md shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-[bounce_1.4s_ease-in-out_infinite]" />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
            </div>
          </div>
        )}
      </div>

      {/* Quick chips */}
      {showChips && !loading && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto border-t border-[var(--border-base)] bg-white flex-shrink-0">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[var(--border-base)] bg-white p-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // Auto-resize
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Escribi un mensaje..."
            rows={1}
            className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-xl px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--blue)] focus:shadow-[var(--shadow-focus)] resize-none transition-all"
            disabled={loading}
            style={{ minHeight: '36px', maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-9 w-9 rounded-xl bg-[var(--blue)] text-white flex items-center justify-center hover:bg-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Mobile floating button + fullscreen modal
export function AgentChatMobile() {
  const [open, setOpen] = useState(false)

  // Listen for open event
  useEffect(() => {
    function handleOpen() { setOpen(true) }
    window.addEventListener('open-agent-widget', handleOpen)
    return () => window.removeEventListener('open-agent-widget', handleOpen)
  }, [])

  return (
    <>
      {/* Floating button - mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[var(--blue)] text-white shadow-lg hover:bg-[#1d4ed8] transition-all flex items-center justify-center"
      >
        <span className="text-xl">🤖</span>
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
      </button>

      {/* Fullscreen modal - mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-base)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Agente IA</span>
            <button
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-[var(--blue)]"
            >
              Cerrar
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AgentChat />
          </div>
        </div>
      )}
    </>
  )
}

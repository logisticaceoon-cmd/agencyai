'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Settings, ArrowRight, Paperclip, X as XIcon, Image as ImageIcon, Maximize2, Minimize2, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import Link from 'next/link'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
  imagePreview?: string // base64 data URL for display
}

interface ImageAttachment {
  dataUrl: string       // for preview
  base64: string        // raw base64
  mimeType: string
  name: string
}

const QUICK_CHIPS = [
  'Qué tareas tengo hoy?',
  'Análisis completo',
  'Crear tarea',
  'Ver proyectos en riesgo',
  'Generar reporte',
  'Cómo estoy este mes?',
]

const STICKERS = [
  '🔥', '💪', '✅', '🚀', '👍', '❤️',
  '😂', '🎯', '💡', '⚡', '🙌', '😎',
  '📈', '💰', '🏆', '😅', '👀', '🤝',
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
  const [agentName, setAgentName] = useState('Ceonyx')
  const [agentAvatar, setAgentAvatar] = useState('🤖')
  const [hasAI, setHasAI] = useState<boolean | null>(null)
  const [greeted, setGreeted] = useState(false)
  const [attachment, setAttachment] = useState<ImageAttachment | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          setAgentName(d.data.agent_name || 'Ceonyx')
          setAgentAvatar(d.data.agent_avatar || '🤖')
        }
      })
      .catch(() => {})
  }, [])

  // Auto-greeting on mount (once per day)
  useEffect(() => {
    if (!user || greeted) return
    const today = new Date().toDateString()
    const key = `greeting_${org?.id || 'default'}`
    const last = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    if (last === today) { setGreeted(true); return }
    setGreeted(true)
    if (typeof window !== 'undefined') localStorage.setItem(key, today)
    sendToApi('[SISTEMA: Saludo inicial del dia. El usuario acaba de abrir el dashboard.]', true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, greeted])

  // Handle image file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      // Extract pure base64 without the data:image/xxx;base64, prefix
      const base64 = dataUrl.split(',')[1]
      setAttachment({ dataUrl, base64, mimeType: file.type, name: file.name })
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const sendToApi = useCallback(async (text: string, isSystem = false, img?: ImageAttachment | null) => {
    if (loading) return

    const userMsg: ChatMessage | null = isSystem ? null : {
      id: generateId(),
      role: 'user',
      content: text,
      time: getTimeStr(),
      imagePreview: img?.dataUrl,
    }

    const updatedMessages = userMsg ? [...messages, userMsg] : [...messages]
    if (userMsg) setMessages(updatedMessages)
    setLoading(true)
    setAttachment(null)

    try {
      const apiMessages = isSystem
        ? [{ role: 'user' as const, content: text }]
        : updatedMessages.map(m => ({ role: m.role, content: m.content }))

      const body: Record<string, unknown> = {
        messages: apiMessages,
        message: text,
        module: 'dashboard',
        context: {},
      }

      // Attach image if present
      if (img) {
        body.imageBase64 = img.base64
        body.imageMimeType = img.mimeType
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

      if (data.action) {
        await executeAction(data.action)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'Error de conexión. Intentá de nuevo.',
        time: getTimeStr(),
      }])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading])

  async function executeAction(action: { type: string; data: Record<string, unknown> }) {
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
            content: `✓ Tarea "${action.data.title}" creada en tu tablero.`,
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
          content: '✓ Tarea marcada como completada.',
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
            content: '✓ Reporte creado. Podés verlo en la sección Reportes.',
            time: getTimeStr(),
          }])
        }
      }
    } catch {
      // silently fail action
    }
  }

  function handleSend() {
    if ((!input.trim() && !attachment) || loading) return
    const text = input.trim() || (attachment ? 'Analizá esta imagen.' : '')
    const img = attachment
    sendToApi(text, false, img)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showChips = messages.length === 0 || (messages.length <= 1 && messages[0]?.role === 'assistant')

  return (
    <div className={cn(
      "flex flex-col bg-white border border-[var(--border-base)] overflow-hidden transition-all duration-200",
      expanded
        ? "fixed inset-4 z-50 rounded-2xl shadow-2xl"
        : "h-full rounded-[var(--radius-lg)]"
    )}>
      {/* Backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/30 -z-10"
          onClick={() => setExpanded(false)}
        />
      )}

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
              {hasAI === false ? 'Sin IA' : 'En línea'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
          title={expanded ? 'Reducir' : 'Expandir chat'}
        >
          {expanded ? <Minimize2 size={14} strokeWidth={1.5} /> : <Maximize2 size={14} strokeWidth={1.5} />}
        </button>
        <Link
          href="/settings/ai"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
          title="Configurar agente IA"
        >
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
            <p className="text-[11px] text-amber-700 mb-2">
              El owner del workspace debe configurar la API key para activar las respuestas inteligentes para todo el equipo.
            </p>
            <Link href="/settings/ai" className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-900 transition-colors">
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
                {/* Image preview if user sent an image */}
                {msg.imagePreview && (
                  <div className={cn('mb-1', isUser ? 'flex justify-end' : '')}>
                    <img
                      src={msg.imagePreview}
                      alt="Imagen adjunta"
                      className="max-w-[220px] max-h-[160px] rounded-xl object-cover border border-white/30 shadow-sm"
                    />
                  </div>
                )}
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
              onClick={() => sendToApi(chip)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Image preview strip */}
      {attachment && (
        <div className="px-3 pt-2 border-t border-[var(--border-base)] bg-white flex-shrink-0">
          <div className="relative inline-block">
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="h-16 w-16 rounded-lg object-cover border border-slate-200"
            />
            <button
              onClick={() => setAttachment(null)}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-900 transition-colors"
            >
              <XIcon size={10} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 rounded-b-lg px-1 py-0.5">
              <p className="text-[9px] text-white truncate">{attachment.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sticker picker */}
      {showStickers && (
        <div className="border-t border-[var(--border-base)] bg-white px-3 pt-2 pb-1 flex-shrink-0">
          <div className="grid grid-cols-9 gap-1">
            {STICKERS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  sendToApi(s)
                  setShowStickers(false)
                }}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[var(--border-base)] bg-white p-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          {/* Image upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="h-9 w-9 rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)] disabled:opacity-40 transition-colors flex-shrink-0"
            title="Adjuntar imagen"
          >
            <Paperclip size={15} strokeWidth={1.5} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Sticker button */}
          <button
            type="button"
            onClick={() => setShowStickers(!showStickers)}
            disabled={loading}
            className={cn(
              "h-9 w-9 rounded-xl border text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)] disabled:opacity-40 transition-colors flex-shrink-0",
              showStickers ? "border-blue-300 bg-blue-50 text-blue-500" : "border-[var(--border-base)]"
            )}
            title="Stickers"
          >
            <Smile size={15} strokeWidth={1.5} />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder={attachment ? 'Preguntá algo sobre la imagen...' : 'Escribí un mensaje...'}
            rows={1}
            className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-xl px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--blue)] focus:shadow-[var(--shadow-focus)] resize-none transition-all"
            disabled={loading}
            style={{ minHeight: '36px', maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attachment) || loading}
            className="h-9 w-9 rounded-xl bg-[var(--blue)] text-white flex items-center justify-center hover:bg-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={16} strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 pl-[4.5rem]">
          <ImageIcon size={9} className="inline mr-0.5" /> Adjuntá capturas de campaña, métricas o creativos
        </p>
      </div>
    </div>
  )
}

// Mobile floating button + fullscreen modal
export function AgentChatMobile() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleOpen() { setOpen(true) }
    window.addEventListener('open-agent-widget', handleOpen)
    return () => window.removeEventListener('open-agent-widget', handleOpen)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[var(--blue)] text-white shadow-lg hover:bg-[#1d4ed8] transition-all flex items-center justify-center"
      >
        <span className="text-xl">🤖</span>
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-base)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Agente IA</span>
            <button onClick={() => setOpen(false)} className="text-sm font-medium text-[var(--blue)]">Cerrar</button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AgentChat />
          </div>
        </div>
      )}
    </>
  )
}

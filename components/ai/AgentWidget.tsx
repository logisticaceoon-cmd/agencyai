'use client'

// Legacy AgentWidget — renders as a floating chat button for pages other than dashboard
import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AgentConfig {
  name: string
  description: string
  module: string
  suggestions: string[]
  context?: Record<string, unknown>
}

export function AgentWidget({ config }: { config: AgentConfig }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [agentAvatar, setAgentAvatar] = useState('🤖')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    fetch('/api/ai/config').then(r => r.json()).then(d => {
      if (d.data?.agent_avatar) setAgentAvatar(d.data.agent_avatar)
    }).catch(() => {})
  }, [])

  // Listen for open event
  useEffect(() => {
    function handleOpen() { setOpen(true) }
    window.addEventListener('open-agent-widget', handleOpen)
    return () => window.removeEventListener('open-agent-widget', handleOpen)
  }, [])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setShowSuggestions(false)
    const userMsg: Message = { role: 'user', content: text.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          messages: updated.map(m => ({ role: m.role, content: m.content })),
          module: config.module,
          context: config.context || {},
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'Error al procesar.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexion.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[var(--blue)] text-white shadow-lg hover:bg-[#1d4ed8] transition-all hover:scale-105 flex items-center justify-center"
          title={config.name}
        >
          <span className="text-xl">{agentAvatar}</span>
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-[var(--border-base)] flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-lg">{agentAvatar}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{config.name}</p>
              <p className="text-[10px] text-blue-100 truncate">{config.description}</p>
            </div>
            <button onClick={() => { setOpen(false); setMessages([]); setShowSuggestions(true) }} className="text-white/80 hover:text-white p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#f0f2f5' }}>
            {messages.length === 0 && (
              <div className="text-center py-8">
                <span className="text-3xl block mb-3">{agentAvatar}</span>
                <p className="text-sm text-[var(--text-secondary)]">Hola! Soy tu {config.name.toLowerCase()}.</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Preguntame lo que necesites.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-[var(--blue)] text-white rounded-2xl rounded-br-md'
                    : 'bg-white text-[var(--text-primary)] rounded-2xl rounded-bl-md shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-md shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-[bounce_1.4s_ease-in-out_infinite]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
                </div>
              </div>
            )}

            {showSuggestions && messages.length === 0 && (
              <div className="space-y-2 pt-2">
                {config.suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} className="w-full text-left px-3 py-2 text-xs text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-3">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribi tu mensaje..."
                className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--blue)] focus:shadow-[var(--shadow-focus)]"
                disabled={loading}
              />
              <button type="submit" disabled={!input.trim() || loading} className="h-9 w-9 rounded-xl bg-[var(--blue)] text-white flex items-center justify-center hover:bg-[#1d4ed8] disabled:opacity-40 transition-colors flex-shrink-0">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

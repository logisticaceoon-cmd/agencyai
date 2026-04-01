'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, Bot, Zap, FileText, CheckSquare, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: ActionButton[]
}

interface ActionButton {
  label: string
  icon: string
  action: string
}

interface AgentConfig {
  name: string
  description: string
  module: string
  suggestions: string[]
  context?: Record<string, unknown>
}

const AUTONOMOUS_STEPS = [
  { text: 'Analizando tus tareas...', icon: '🔍' },
  { text: 'Revisando proyectos activos...', icon: '📋' },
  { text: 'Verificando estado de clientes...', icon: '👥' },
  { text: 'Revisando finanzas del mes...', icon: '💰' },
  { text: 'Preparando recomendaciones...', icon: '🎯' },
]

export function AgentWidget({ config }: { config: AgentConfig }) {
  const { user } = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [autonomousMode, setAutonomousMode] = useState(false)
  const [showAutonomousConfirm, setShowAutonomousConfirm] = useState(false)
  const [autonomousStep, setAutonomousStep] = useState(-1)
  const [agentName, setAgentName] = useState(config.name)
  const [agentAvatar, setAgentAvatar] = useState('🤖')
  const [executingAction, setExecutingAction] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, autonomousStep])

  // Load agent config
  useEffect(() => {
    fetch('/api/ai/config')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setAgentName(d.data.agent_name || config.name)
          setAgentAvatar(d.data.agent_avatar || '🤖')
        }
      })
      .catch(() => {})
  }, [config.name])

  // Listen for open event from DashboardAgent
  useEffect(() => {
    function handleOpen() { setOpen(true) }
    window.addEventListener('open-agent-widget', handleOpen)
    return () => window.removeEventListener('open-agent-widget', handleOpen)
  }, [])

  // Parse action from response
  function parseAction(text: string): { cleanText: string; actionData: any | null } {
    const actionMatch = text.match(/\[ACTION:(.*?)\]/)
    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1])
        const cleanText = text.replace(/\[ACTION:.*?\]/, '').trim()
        return { cleanText, actionData }
      } catch {
        return { cleanText: text, actionData: null }
      }
    }
    return { cleanText: text, actionData: null }
  }

  // Execute parsed action
  async function executeAction(actionData: { type: string; data: any }) {
    setExecutingAction(actionData.type)
    try {
      switch (actionData.type) {
        case 'create_task': {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: actionData.data.title,
              priority: actionData.data.priority || 'medium',
              deadline: actionData.data.dueDate || undefined,
              status: 'pending',
              assignedTo: user ? [user.id] : [],
            }),
          })
          if (res.ok) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Tarea "${actionData.data.title}" creada exitosamente en tu tablero.` }])
          }
          break
        }
        case 'complete_task': {
          await fetch(`/api/tasks/${actionData.data.taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed', progressPercent: 100 }),
          })
          setMessages(prev => [...prev, { role: 'assistant', content: 'Tarea marcada como completada.' }])
          break
        }
        case 'create_report': {
          const res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Reporte semanal generado por IA',
              type: 'client_update',
              clientId: actionData.data.clientId || undefined,
              content: actionData.data.content || 'Reporte generado automaticamente.',
            }),
          })
          if (res.ok) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Reporte semanal creado. Podes verlo en la seccion Reportes.' }])
          }
          break
        }
        case 'schedule_meeting': {
          const res = await fetch('/api/minutes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: actionData.data.title || 'Reunion programada',
              meeting_date: actionData.data.date || new Date().toISOString(),
              meeting_type: 'followup',
              status: 'draft',
            }),
          })
          if (res.ok) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Minuta "${actionData.data.title}" creada. Podes editarla en Minutas.` }])
          }
          break
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error al ejecutar la accion. Intenta de nuevo.' }])
    } finally {
      setExecutingAction(null)
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    setShowSuggestions(false)
    const userMsg: Message = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      // Send full message history for conversation memory
      const historyForApi = updatedMessages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          messages: historyForApi,
          module: config.module,
          context: config.context || {},
        }),
      })

      const data = await res.json()
      const rawResponse = data.response || 'Error al procesar.'
      const { cleanText, actionData } = parseAction(rawResponse)

      setMessages(prev => [...prev, { role: 'assistant', content: cleanText }])

      // Auto-execute action if detected
      if (actionData) {
        await executeAction(actionData)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexion. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  // Autonomous analysis
  async function startAutonomousAnalysis() {
    setShowAutonomousConfirm(false)
    setAutonomousMode(true)
    setShowSuggestions(false)

    // Animated steps
    for (let i = 0; i < AUTONOMOUS_STEPS.length; i++) {
      setAutonomousStep(i)
      await new Promise(r => setTimeout(r, 1500))
    }

    // Call analysis API
    try {
      const res = await fetch('/api/ai/autonomous-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user?.fullName?.split(' ')[0] || 'Usuario',
          agentName,
          agentPersonality: 'profesional',
        }),
      })
      const data = await res.json()

      setAutonomousStep(-1)
      setAutonomousMode(false)

      const analysisMsg: Message = {
        role: 'assistant',
        content: data.analysis || 'No se pudo completar el analisis.',
        actions: [
          { label: 'Crear plan como tareas', icon: '📋', action: 'create_plan' },
          { label: 'Generar reporte semanal', icon: '📊', action: 'create_report' },
        ],
      }
      setMessages(prev => [...prev, analysisMsg])
    } catch {
      setAutonomousStep(-1)
      setAutonomousMode(false)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error al realizar el analisis. Intenta de nuevo.' }])
    }
  }

  async function handleActionButton(action: string) {
    setExecutingAction(action)
    try {
      if (action === 'create_plan') {
        // Create tasks from the analysis
        const planTasks = [
          'Resolver tareas vencidas urgentes',
          'Revisar progreso de proyectos activos',
          'Contactar clientes sin actividad reciente',
        ]
        let created = 0
        for (const title of planTasks) {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, status: 'pending', priority: 'high', assignedTo: user ? [user.id] : [] }),
          })
          if (res.ok) created++
        }
        setMessages(prev => [...prev, { role: 'assistant', content: `Cree ${created} tareas en tu tablero de Tareas basadas en el plan del dia.` }])
      } else if (action === 'create_report') {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Reporte semanal - Generado por IA',
            type: 'client_update',
            content: 'Reporte generado automaticamente por el agente de IA.',
          }),
        })
        if (res.ok) {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Genere tu reporte semanal. Podes verlo en la seccion Reportes.' }])
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error al ejecutar. Intenta de nuevo.' }])
    } finally {
      setExecutingAction(null)
    }
  }

  function handleClose() {
    setOpen(false)
    setMessages([])
    setShowSuggestions(true)
    setAutonomousMode(false)
    setAutonomousStep(-1)
    setShowAutonomousConfirm(false)
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center group"
          title={agentName}
        >
          <span className="text-xl">{agentAvatar}</span>
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
          <span className="absolute right-full mr-3 whitespace-nowrap bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {agentName}
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
              {agentAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{agentName}</p>
              <p className="text-[10px] text-blue-100 truncate">{config.description}</p>
            </div>
            {/* Autonomous mode button */}
            <button
              onClick={() => setShowAutonomousConfirm(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 text-white text-[10px] font-semibold hover:bg-white/25 transition-colors"
              title="Modo autonomo"
            >
              <Zap className="h-3 w-3" /> Autonomo
            </button>
            <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Autonomous confirmation modal */}
          {showAutonomousConfirm && (
            <div className="absolute inset-0 z-10 bg-white flex flex-col rounded-2xl">
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center text-2xl mb-4">
                  {agentAvatar}
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                  Queres que {agentName} trabaje de forma autonoma?
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">El agente puede hacer por vos:</p>
                <div className="text-left text-sm space-y-1.5 mb-6">
                  <p className="text-[var(--text-secondary)]">✅ Revisar todas tus tareas y priorizarlas</p>
                  <p className="text-[var(--text-secondary)]">✅ Detectar proyectos en riesgo de atraso</p>
                  <p className="text-[var(--text-secondary)]">✅ Generar el reporte semanal automaticamente</p>
                  <p className="text-[var(--text-secondary)]">✅ Identificar clientes sin actividad reciente</p>
                  <p className="text-[var(--text-secondary)]">✅ Crear un plan de trabajo para hoy</p>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-6">
                  El agente va a leer toda la informacion de tu workspace para darte recomendaciones personalizadas.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAutonomousConfirm(false)}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={startAutonomousAnalysis}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    Si, analizar todo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !autonomousMode && (
              <div className="text-center py-8">
                <span className="text-4xl block mb-3">{agentAvatar}</span>
                <p className="text-sm text-[var(--text-secondary)]">Hola! Soy {agentName}.</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Preguntame lo que necesites o activa el modo autonomo.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                <div className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
                {/* Action buttons after assistant messages */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-1">
                    {msg.actions.map((btn, j) => (
                      <button
                        key={j}
                        onClick={() => handleActionButton(btn.action)}
                        disabled={executingAction !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {executingAction === btn.action ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span>{btn.icon}</span>
                        )}
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Autonomous mode steps */}
            {autonomousMode && autonomousStep >= 0 && (
              <div className="space-y-2">
                {AUTONOMOUS_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300',
                      i < autonomousStep ? 'bg-emerald-50 text-emerald-700' :
                      i === autonomousStep ? 'bg-blue-50 text-blue-700 animate-pulse' :
                      'bg-slate-50 text-slate-400'
                    )}
                  >
                    <span>{i <= autonomousStep ? (i < autonomousStep ? '✅' : step.icon) : '⏳'}</span>
                    <span className="text-xs font-medium">{step.text}</span>
                    {i === autonomousStep && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                  </div>
                ))}
              </div>
            )}

            {loading && !autonomousMode && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                  <span className="text-xs text-slate-400">Escribiendo...</span>
                </div>
              </div>
            )}

            {showSuggestions && messages.length === 0 && !autonomousMode && (
              <div className="space-y-2 pt-2">
                {config.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left px-3 py-2 text-xs text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribi tu mensaje..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                disabled={loading || autonomousMode}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading || autonomousMode}
                className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

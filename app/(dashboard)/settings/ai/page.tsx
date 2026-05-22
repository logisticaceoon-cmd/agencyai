'use client'

import { useState, useEffect } from 'react'
import { Bot, Key, Eye, EyeOff, Check, X, Loader2, Sparkles, Shield, Image as ImageIcon, Users } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export default function AISettingsPage() {
  const { user, org } = useCurrentUser()
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false)
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [provider, setProvider] = useState<'anthropic' | 'openai'>('anthropic')
  const [agentName, setAgentName] = useState('Ceonyx')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ai/config')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setHasAnthropicKey(!!d.data.has_anthropic_key)
          setHasOpenaiKey(!!d.data.has_openai_key)
          setProvider(d.data.ai_provider || 'anthropic')
          setAgentName(d.data.agent_name || 'Ceonyx')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const isOwner = user?.role === 'owner'
  const hasAnyKey = hasAnthropicKey || hasOpenaiKey

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const body: Record<string, string> = {
        ai_provider: provider,
        agent_name: agentName.trim() || 'Ceonyx',
      }
      if (anthropicKey.trim()) body.anthropic_api_key = anthropicKey.trim()
      if (openaiKey.trim()) body.openai_api_key = openaiKey.trim()

      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setMsg({ type: 'ok', text: 'Configuración guardada. Todos los miembros del workspace ya tienen IA activada.' })
        if (anthropicKey.trim()) setHasAnthropicKey(true)
        if (openaiKey.trim()) setHasOpenaiKey(true)
        setAnthropicKey('')
        setOpenaiKey('')
      } else {
        const err = await res.json()
        setMsg({ type: 'err', text: err.error || 'Error al guardar' })
      }
    } catch {
      setMsg({ type: 'err', text: 'Error de conexión' })
    }
    setSaving(false)
    setTimeout(() => setMsg(null), 5000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agente de IA</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configurá la IA una sola vez y todos los miembros del workspace la usan automáticamente.
        </p>
      </div>

      {/* Status */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${hasAnyKey ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${hasAnyKey ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {hasAnyKey
            ? <Check className="h-5 w-5 text-emerald-600" />
            : <Bot className="h-5 w-5 text-amber-600" />
          }
        </div>
        <div>
          <p className={`text-sm font-semibold ${hasAnyKey ? 'text-emerald-800' : 'text-amber-800'}`}>
            {hasAnyKey ? 'IA activa para todo el workspace' : 'IA sin configurar'}
          </p>
          <p className={`text-xs mt-0.5 ${hasAnyKey ? 'text-emerald-700' : 'text-amber-700'}`}>
            {hasAnyKey
              ? 'Ceonyx está disponible para todos los miembros del equipo. Cada uno recibe respuestas según su rol.'
              : 'Ingresá tu API key para que Ceonyx funcione para vos y todo tu equipo sin configuración adicional.'}
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          Cómo funciona
        </h3>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">1</span>
            <p>Vos (el owner) cargás la API key una sola vez aquí.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">2</span>
            <p>Todos los miembros del equipo (Stephany, Jessica, etc.) tienen acceso a la IA automáticamente.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">3</span>
            <p>Ceonyx ajusta su tono y lo que comparte según el rol de cada usuario (owner, trafficker, etc.).</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">4</span>
            <p>También pueden subir imágenes (capturas de campañas, creativos, métricas) para que Ceonyx las analice.</p>
          </div>
        </div>
      </div>

      {/* Non-owner message */}
      {!isOwner && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-slate-400 flex-shrink-0" />
          <p className="text-sm text-slate-600">Solo el owner del workspace puede modificar la configuración de IA. Contactá a tu administrador.</p>
        </div>
      )}

      {isOwner && (
        <>
          {/* Provider selector */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              Modelo de IA
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: 'anthropic',
                  name: 'Anthropic Claude',
                  desc: 'Claude Sonnet — el más inteligente para estrategia y análisis de imágenes',
                  badge: 'Recomendado',
                  imageSupport: true,
                },
                {
                  id: 'openai',
                  name: 'OpenAI GPT-4',
                  desc: 'GPT-4o Mini — alternativa económica, también soporta imágenes',
                  badge: null,
                  imageSupport: true,
                },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id as 'anthropic' | 'openai')}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${provider === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                    {p.badge && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{p.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                  {p.imageSupport && (
                    <div className="flex items-center gap-1 mt-2">
                      <ImageIcon className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-medium">Soporta análisis de imágenes</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* API Keys */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-500" />
              API Keys
            </h2>

            {/* Anthropic Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Anthropic API Key
                {hasAnthropicKey && (
                  <span className="ml-2 text-[11px] font-normal text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ Configurada</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showAnthropicKey ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder={hasAnthropicKey ? '•••••••••••••••••••• (dejá vacío para mantener la actual)' : 'sk-ant-api03-...'}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Conseguila en{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  console.anthropic.com
                </a>
              </p>
            </div>

            {/* OpenAI Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                OpenAI API Key{' '}
                <span className="font-normal text-slate-400">(opcional — para fallback)</span>
                {hasOpenaiKey && (
                  <span className="ml-2 text-[11px] font-normal text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ Configurada</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder={hasOpenaiKey ? '•••••••••••••••••••• (dejá vacío para mantener)' : 'sk-proj-...'}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Agent name */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Nombre del agente</h2>
            <p className="text-xs text-slate-500 mb-3">Cómo se presenta el agente al equipo</p>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Ceonyx"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Feedback */}
          {msg && (
            <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {msg.type === 'ok' ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
              {msg.text}
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

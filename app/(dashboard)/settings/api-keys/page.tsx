'use client'

import { useState, useEffect } from 'react'
import { Key, Plus, Copy, Check, Trash2, Loader2, ChevronDown, ChevronRight, ExternalLink, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiKey {
  id: string
  name: string
  key?: string
  description: string | null
  status: string
  last_used_at: string | null
  created_at: string
}

const COWORK_ENDPOINT = 'https://agencyai-iota.vercel.app/api/cowork'

function maskKey(key: string): string {
  if (key.length <= 20) return key
  return key.slice(0, 14) + '****' + key.slice(-6)
}

function timeAgo(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days}d`
  return d.toLocaleDateString('es-ES')
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; name: string } | null>(null)

  async function fetchKeys() {
    setLoading(true)
    try {
      const res = await fetch('/api/cowork/api-keys')
      if (res.ok) {
        const j = await res.json()
        setKeys(j.data || [])
      }
    } catch (err) {
      console.error('Error fetching API keys:', err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchKeys() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/cowork/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      if (res.ok) {
        const j = await res.json()
        setNewKey(j.data.key)
        setName('')
        setDescription('')
        setShowForm(false)
        fetchKeys()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al crear API key')
      }
    } catch (err) {
      console.error('Error creating API key:', err)
    }
    setCreating(false)
  }

  async function handleRevoke(id: string, keyName: string) {
    setConfirmRevoke({ id, name: keyName })
  }

  async function executeRevoke(id: string) {
    try {
      const res = await fetch(`/api/cowork/api-keys?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setKeys(keys.filter(k => k.id !== id))
      }
    } catch (err) {
      console.error('Error revoking API key:', err)
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
        <p className="mt-1 text-sm text-slate-500">
          Claves para conectar herramientas externas como Cowork Desktop
        </p>
      </div>

      {/* New key success alert */}
      {newKey && (
        <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm font-semibold text-green-800">
              API Key creada exitosamente
            </p>
          </div>
          <p className="text-sm text-green-700">
            Copia esta key ahora. Por seguridad, no se mostrara de nuevo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white px-4 py-2.5 rounded-lg border border-green-200 text-sm font-mono text-green-900 break-all select-all">
              {newKey}
            </code>
            <button
              onClick={() => copyToClipboard(newKey, 'new')}
              className={cn(
                'shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                copiedId === 'new'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              {copiedId === 'new' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedId === 'new' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-green-600 hover:text-green-800 transition-colors"
          >
            Cerrar este mensaje
          </button>
        </div>
      )}

      {/* Generate new key */}
      {showForm ? (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Nueva API Key</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Cowork Integration"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Para que se usa esta key"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-1.5',
                creating || !name.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Generar API Key
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setName(''); setDescription('') }}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 transition-colors w-full justify-center"
        >
          <Plus className="w-4 h-4" />
          Generar nueva API Key
        </button>
      )}

      {/* Keys table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Keys activas</h2>
          <span className="text-xs text-slate-400 ml-auto">{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
          </div>
        ) : keys.length === 0 ? (
          <div className="p-10 text-center">
            <Key className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">No hay API keys</p>
            <p className="text-xs text-slate-400 mt-1">Genera una para conectar Cowork u otras herramientas.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 border-b border-slate-50 text-xs font-medium text-slate-400 uppercase tracking-wide">
              <div className="col-span-3">Nombre</div>
              <div className="col-span-4">Key</div>
              <div className="col-span-2">Creada</div>
              <div className="col-span-2">Ultimo uso</div>
              <div className="col-span-1"></div>
            </div>
            {/* Table rows */}
            <div className="divide-y divide-slate-50">
              {keys.map(k => (
                <div key={k.id} className="px-5 py-3 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center flex flex-col gap-2">
                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{k.name}</p>
                    {k.description && <p className="text-xs text-slate-400 truncate">{k.description}</p>}
                  </div>
                  <div className="col-span-4">
                    <code className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded">
                      {k.key ? maskKey(k.key) : 'sk_agencyai_****'}
                    </code>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400">
                      {timeAgo(k.created_at)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400">
                      {k.last_used_at ? timeAgo(k.last_used_at) : 'Nunca'}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => handleRevoke(k.id, k.name)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Revocar key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Cowork Setup Guide (collapsible) */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Instrucciones para Cowork</span>
          </div>
          {showGuide
            ? <ChevronDown className="w-4 h-4 text-blue-400" />
            : <ChevronRight className="w-4 h-4 text-blue-400" />
          }
        </button>

        {showGuide && (
          <div className="px-5 pb-5 space-y-4">
            <div className="space-y-3">
              {[
                { step: 1, text: 'Copia tu API key desde la tabla de arriba (o genera una nueva)' },
                { step: 2, text: 'Abri Cowork Desktop en tu computadora' },
                { step: 3, text: 'Anda a Settings → Integrations → AgencyAI' },
                { step: 4, text: 'Pega tu API key en el campo correspondiente' },
                { step: 5, text: 'Configura el endpoint (ver abajo)' },
                { step: 6, text: 'Click en "Test Connection"' },
                { step: 7, text: 'Listo! Las tareas de AgencyAI aparecen en Cowork automaticamente' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {s.step}
                  </span>
                  <p className="text-sm text-blue-700 pt-0.5">{s.text}</p>
                </div>
              ))}
            </div>

            {/* Endpoint copy */}
            <div>
              <label className="block text-xs font-medium text-blue-600 mb-1.5">Endpoint de la API</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-blue-200 text-sm font-mono text-blue-900 break-all">
                  {COWORK_ENDPOINT}
                </code>
                <button
                  onClick={() => copyToClipboard(COWORK_ENDPOINT, 'endpoint')}
                  className={cn(
                    'shrink-0 px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5',
                    copiedId === 'endpoint'
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  {copiedId === 'endpoint' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedId === 'endpoint' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Docs link */}
            <div className="pt-1">
              <a
                href="/documentation"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
              >
                Ver documentacion completa de la API
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Confirm revoke modal */}
      {confirmRevoke && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Confirmar revocación</h3>
            <p className="text-gray-600 mb-4">¿Revocar &quot;{confirmRevoke.name}&quot;? Dejará de funcionar inmediatamente y no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmRevoke(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={() => { executeRevoke(confirmRevoke.id); setConfirmRevoke(null) }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Revocar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

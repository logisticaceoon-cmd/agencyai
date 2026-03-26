'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/store/auth'
import { AlertTriangle, AlertCircle, Info, TrendingUp, RefreshCw, Shield, Users, FileText, DollarSign, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Alert {
  id: string
  type: 'warning' | 'danger' | 'info' | 'success'
  category: string
  title: string
  message: string
  entityType?: string
  entityId?: string
  clientName?: string
}

interface Summary {
  total: number
  danger: number
  warning: number
  info: number
  success: number
}

export default function AlertsPage() {
  const { org } = useAuthStore()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, danger: 0, warning: 0, info: 0, success: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  const fetchAlerts = () => {
    setLoading(true)
    fetch('/api/alerts')
      .then(r => r.json())
      .then(j => {
        setAlerts(j.data || [])
        setSummary(j.summary || { total: 0, danger: 0, warning: 0, info: 0, success: 0 })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchAlerts() }, [])

  const filteredAlerts = filter ? alerts.filter(a => a.type === filter) : alerts

  const typeConfig = {
    danger: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Crítico' },
    warning: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Atención' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Info' },
    success: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Positivo' },
  }

  const categoryIcon = (cat: string) => {
    if (cat.includes('tarea') || cat.includes('Tarea')) return CheckSquare
    if (cat.includes('ROAS') || cat.includes('roas')) return TrendingUp
    if (cat.includes('reporte') || cat.includes('Reporte')) return FileText
    if (cat.includes('pago') || cat.includes('Pago')) return DollarSign
    if (cat.includes('riesgo') || cat.includes('Riesgo')) return Shield
    if (cat.includes('escalar') || cat.includes('Escalar')) return TrendingUp
    if (cat.includes('actividad') || cat.includes('Sin')) return Users
    return AlertCircle
  }

  const getEntityLink = (alert: Alert) => {
    if (!alert.entityType || !alert.entityId) return null
    switch (alert.entityType) {
      case 'task': return `/tasks/${alert.entityId}`
      case 'client': return `/clients/${alert.entityId}`
      case 'finance': return '/finances'
      default: return null
    }
  }

  if (!org) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="IA & Alertas"
        description="Alertas automáticas, anomalías y recomendaciones"
        action={
          <button onClick={fetchAlerts} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Actualizar
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button onClick={() => setFilter(null)} className={cn(
          'rounded-xl border p-4 text-left transition-colors',
          !filter ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
        )}>
          <p className="text-2xl font-bold text-white">{summary.total}</p>
          <p className="text-xs text-zinc-400">Total alertas</p>
        </button>
        {(['danger', 'warning', 'info', 'success'] as const).map(type => {
          const cfg = typeConfig[type]
          return (
            <button key={type} onClick={() => setFilter(filter === type ? null : type)} className={cn(
              'rounded-xl border p-4 text-left transition-colors',
              filter === type ? `${cfg.border} ${cfg.bg}` : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
            )}>
              <p className={cn('text-2xl font-bold', cfg.color)}>{summary[type]}</p>
              <p className="text-xs text-zinc-400">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />)}</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <Shield className="h-12 w-12 text-green-500/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Todo en orden</h3>
          <p className="text-sm text-zinc-400">No hay alertas activas en este momento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Group by category */}
          {Array.from(new Set(filteredAlerts.map(a => a.category))).map(category => {
            const catAlerts = filteredAlerts.filter(a => a.category === category)
            const CatIcon = categoryIcon(category)
            return (
              <div key={category} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800">
                  <CatIcon className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-300">{category}</span>
                  <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full ml-auto">{catAlerts.length}</span>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {catAlerts.map(alert => {
                    const cfg = typeConfig[alert.type]
                    const Icon = cfg.icon
                    const link = getEntityLink(alert)

                    const content = (
                      <div className={cn('flex items-center gap-4 px-5 py-3 transition-colors', link && 'hover:bg-zinc-800/50')}>
                        <div className={cn('rounded-lg p-1.5 flex-shrink-0', cfg.bg)}>
                          <Icon className={cn('h-4 w-4', cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">{alert.title}</p>
                          <p className="text-xs text-zinc-500">{alert.message}</p>
                        </div>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                      </div>
                    )

                    return link ? (
                      <Link key={alert.id} href={link}>{content}</Link>
                    ) : (
                      <div key={alert.id}>{content}</div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* AI Features Coming Soon */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-lg">🧠</span> Próximas funciones de IA
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            'Análisis automático de métricas',
            'Recomendaciones de optimización',
            'Lectura inteligente de minutas',
            'Creación automática de tareas',
            'Transcripción de grabaciones',
            'Predicción de churn de clientes',
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

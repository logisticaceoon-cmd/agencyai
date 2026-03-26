'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart,
  FileText, MessageSquare, CheckSquare, Calendar, ArrowLeft,
  BarChart3, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PortalData {
  client: {
    name: string
    brand: string | null
    status: string
    accountManager: { fullName: string; email: string } | null
    serviceType: string | null
  }
  metrics: {
    investment: number
    sales: number
    roas: number
    cpa: number
    conversions: number | null
    growthPct: number
  } | null
  kpiHistory: { month: number; year: number; investment: number; sales: number; roas: number }[]
  reports: {
    id: string; title: string; reportType: string; createdAt: string
    investment: number | null; sales: number | null; roas: number | null
    growthPct: number | null; nextMonthPlan: string | null; description: string
  }[]
  meetings: {
    id: string; title: string; date: string; summary: string | null
    decisions: string | null; nextMeetingDate: string | null
  }[]
  tasksSummary: { completed: number; pending: number }
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function ClientPortalPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'meetings'>('overview')

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(j => { setData(j.data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="animate-pulse text-zinc-400">Cargando portal...</div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-bold text-white mb-2">Portal no disponible</h1>
        <p className="text-zinc-400">El enlace no es válido o ha expirado.</p>
      </div>
    </div>
  )

  const { client, metrics, kpiHistory, reports, meetings, tasksSummary } = data

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">
                {client.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-bold">{client.name}</h1>
                {client.brand && <p className="text-xs text-zinc-500">{client.brand}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {client.accountManager && (
              <div className="text-right">
                <p className="text-xs text-zinc-500">Account Manager</p>
                <p className="text-sm text-zinc-300">{client.accountManager.fullName}</p>
              </div>
            )}
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full font-medium',
              client.status === 'active' ? 'bg-green-500/20 text-green-400' :
              client.status === 'scaling' ? 'bg-blue-500/20 text-blue-400' :
              client.status === 'risk' ? 'bg-red-500/20 text-red-400' :
              'bg-zinc-700 text-zinc-300'
            )}>{client.status}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 w-fit">
          {[
            { key: 'overview', label: 'Resumen', icon: BarChart3 },
            { key: 'reports', label: 'Reportes', icon: FileText },
            { key: 'meetings', label: 'Minutas', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            {metrics ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={DollarSign} label="Inversión" value={`$${metrics.investment.toLocaleString()}`} color="text-blue-400" bg="bg-blue-500/10" />
                <MetricCard icon={ShoppingCart} label="Ventas" value={`$${metrics.sales.toLocaleString()}`} color="text-green-400" bg="bg-green-500/10" />
                <MetricCard icon={Target} label="ROAS" value={`${metrics.roas.toFixed(2)}x`} color={metrics.roas >= 3 ? 'text-green-400' : metrics.roas >= 2 ? 'text-yellow-400' : 'text-red-400'} bg={metrics.roas >= 3 ? 'bg-green-500/10' : metrics.roas >= 2 ? 'bg-yellow-500/10' : 'bg-red-500/10'} />
                <MetricCard
                  icon={metrics.growthPct >= 0 ? TrendingUp : TrendingDown}
                  label="Crecimiento"
                  value={`${metrics.growthPct >= 0 ? '+' : ''}${metrics.growthPct.toFixed(1)}%`}
                  color={metrics.growthPct >= 0 ? 'text-green-400' : 'text-red-400'}
                  bg={metrics.growthPct >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <Activity className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Métricas del mes aún no disponibles</p>
              </div>
            )}

            {/* KPI History */}
            {kpiHistory.length > 1 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Evolución mensual</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {kpiHistory.map((k, i) => (
                    <div key={i} className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 mb-1">{MONTHS_SHORT[k.month - 1]} {k.year}</p>
                      <p className="text-sm font-bold text-white">{k.roas.toFixed(2)}x</p>
                      <p className="text-xs text-zinc-400">${k.sales.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <CheckSquare className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{tasksSummary.completed}</p>
                  <p className="text-xs text-zinc-400">Tareas completadas</p>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4">
                <div className="rounded-lg bg-yellow-500/10 p-3">
                  <Activity className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{tasksSummary.pending}</p>
                  <p className="text-xs text-zinc-400">Tareas en proceso</p>
                </div>
              </div>
            </div>

            {/* Next Meeting */}
            {meetings.length > 0 && meetings[0].nextMeetingDate && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex items-center gap-4">
                <Calendar className="h-5 w-5 text-indigo-400" />
                <div>
                  <p className="text-sm font-medium text-white">Próxima reunión</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(meetings[0].nextMeetingDate).toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
                <FileText className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">No hay reportes disponibles aún</p>
              </div>
            ) : reports.map(report => (
              <div key={report.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">{report.title}</h4>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    {new Date(report.createdAt).toLocaleDateString('es')}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{report.description}</p>
                {(report.investment || report.sales || report.roas) && (
                  <div className="flex gap-4 text-xs">
                    {report.investment && <span className="text-zinc-400">Inversión: <span className="text-white">${Number(report.investment).toLocaleString()}</span></span>}
                    {report.sales && <span className="text-zinc-400">Ventas: <span className="text-green-400">${Number(report.sales).toLocaleString()}</span></span>}
                    {report.roas && <span className="text-zinc-400">ROAS: <span className="text-indigo-400">{Number(report.roas).toFixed(2)}x</span></span>}
                    {report.growthPct && <span className={Number(report.growthPct) >= 0 ? 'text-green-400' : 'text-red-400'}>{Number(report.growthPct) >= 0 ? '+' : ''}{Number(report.growthPct).toFixed(1)}%</span>}
                  </div>
                )}
                {report.nextMonthPlan && (
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Plan próximo mes</p>
                    <p className="text-sm text-zinc-300">{report.nextMonthPlan}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Meetings Tab */}
        {activeTab === 'meetings' && (
          <div className="space-y-4">
            {meetings.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
                <MessageSquare className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">No hay minutas disponibles aún</p>
              </div>
            ) : meetings.map(meeting => (
              <div key={meeting.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">{meeting.title}</h4>
                  <span className="text-xs text-zinc-500">
                    {new Date(meeting.date).toLocaleDateString('es')}
                  </span>
                </div>
                {meeting.summary && <p className="text-sm text-zinc-400">{meeting.summary}</p>}
                {meeting.decisions && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Decisiones</p>
                    <p className="text-sm text-zinc-300">{meeting.decisions}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">Powered by <span className="text-indigo-400 font-medium">AgencyAI</span></p>
        </div>
      </main>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: string; color: string; bg: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className={cn('inline-flex rounded-lg p-2 mb-3', bg)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

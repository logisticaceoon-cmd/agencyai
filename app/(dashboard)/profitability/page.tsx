'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { downloadCSV } from '@/lib/export'
import { downloadPDF } from '@/lib/pdf'
import { cn } from '@/lib/utils'
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, Users,
  Download, ArrowUpRight, ArrowDownRight, Minus, Clock,
  Target, Award,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })

interface ClientProfit {
  id: string
  name: string
  status: string
  revenue: number
  revenueThisMonth: number
  revenueLastMonth: number
  timeCost: number
  totalHours: number
  hoursThisMonth: number
  adSpend: number
  adSpendThisMonth: number
  totalCosts: number
  grossProfit: number
  margin: number
  trend: number
}

interface ProfitData {
  clients: ClientProfit[]
  totals: {
    revenue: number
    revenueThisMonth: number
    costs: number
    timeCost: number
    adSpend: number
    profit: number
    margin: number
    totalHours: number
  }
  trends: { month: string; revenue: number; costs: number; profit: number }[]
  mostProfitable: { name: string; margin: number } | null
}

type SortKey = 'grossProfit' | 'margin' | 'revenue' | 'totalHours' | 'totalCosts'

function fmt(n: number) {
  return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function TrendArrow({ value }: { value: number }) {
  if (value > 0) return <span className="flex items-center gap-0.5 text-xs font-semibold text-green-600"><ArrowUpRight className="h-3 w-3" />{value}%</span>
  if (value < 0) return <span className="flex items-center gap-0.5 text-xs font-semibold text-red-600"><ArrowDownRight className="h-3 w-3" />{Math.abs(value)}%</span>
  return <span className="flex items-center gap-0.5 text-xs text-slate-400"><Minus className="h-3 w-3" />0%</span>
}

export default function ProfitabilityPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<ProfitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('grossProfit')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/profitability?months=6')
        if (res.ok) setData(await res.json())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sortedClients = useMemo(() => {
    if (!data) return []
    return [...data.clients].sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [data, sortBy, sortDir])

  const top10 = useMemo(() => {
    if (!data) return []
    return [...data.clients]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(c => ({ name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name, revenue: c.revenue, costs: c.totalCosts }))
  }, [data])

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(key); setSortDir('desc') }
  }

  function exportData() {
    if (!data) return
    downloadCSV(data.clients.map(c => ({
      cliente: c.name,
      ingresos: c.revenue,
      costo_tiempo: c.timeCost,
      horas: c.totalHours,
      ad_spend: c.adSpend,
      costos_total: c.totalCosts,
      ganancia: c.grossProfit,
      margen: `${c.margin}%`,
      tendencia: `${c.trend}%`,
    })), 'rentabilidad', [
      { key: 'cliente', label: 'Cliente' },
      { key: 'ingresos', label: 'Ingresos' },
      { key: 'costo_tiempo', label: 'Costo Tiempo' },
      { key: 'horas', label: 'Horas' },
      { key: 'ad_spend', label: 'Ad Spend' },
      { key: 'costos_total', label: 'Costos Total' },
      { key: 'ganancia', label: 'Ganancia' },
      { key: 'margen', label: 'Margen' },
      { key: 'tendencia', label: 'Tendencia' },
    ])
  }

  function exportPDFData() {
    if (!data) return
    downloadPDF({
      title: 'Rentabilidad por Cliente',
      subtitle: `${data.clients.length} clientes — Margen general: ${data.totals.margin}%`,
      filename: `rentabilidad_${new Date().toISOString().slice(0, 10)}`,
      orientation: 'landscape',
      columns: [
        { key: 'cliente', label: 'Cliente' },
        { key: 'ingresos', label: 'Ingresos' },
        { key: 'costos', label: 'Costos' },
        { key: 'ganancia', label: 'Ganancia' },
        { key: 'margen', label: 'Margen' },
        { key: 'horas', label: 'Horas' },
      ],
      data: data.clients.map(c => ({
        cliente: c.name,
        ingresos: fmt(c.revenue),
        costos: fmt(c.totalCosts),
        ganancia: fmt(c.grossProfit),
        margen: `${c.margin}%`,
        horas: `${c.totalHours}h`,
      })),
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />)}
        </div>
        <div className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    )
  }

  if (!data || data.clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">{t('profitability.noData')}</h2>
        <p className="text-sm text-slate-500">{t('profitability.noDataDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('profitability.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('profitability.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportData} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={exportPDFData} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-green-50"><DollarSign className="h-4 w-4 text-green-600" /></div>
            <span className="text-xs font-medium text-slate-500">{t('profitability.revenueThisMonth')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{fmt(data.totals.revenueThisMonth)}</p>
          <p className="text-xs text-slate-400 mt-1">{t('common.total')}: {fmt(data.totals.revenue)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-red-50"><TrendingDown className="h-4 w-4 text-red-600" /></div>
            <span className="text-xs font-medium text-slate-500">{t('profitability.costsThisMonth')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{fmt(data.totals.costs)}</p>
          <p className="text-xs text-slate-400 mt-1">Tiempo: {fmt(data.totals.timeCost)} | Ads: {fmt(data.totals.adSpend)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-blue-50"><Target className="h-4 w-4 text-blue-600" /></div>
            <span className="text-xs font-medium text-slate-500">{t('profitability.overallMargin')}</span>
          </div>
          <p className={cn('text-2xl font-bold', data.totals.margin >= 30 ? 'text-green-600' : data.totals.margin >= 15 ? 'text-amber-600' : 'text-red-600')}>
            {data.totals.margin}%
          </p>
          <p className="text-xs text-slate-400 mt-1">{t('profitability.profit')}: {fmt(data.totals.profit)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-purple-50"><Award className="h-4 w-4 text-purple-600" /></div>
            <span className="text-xs font-medium text-slate-500">{t('profitability.mostProfitable')}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 truncate">{data.mostProfitable?.name || '-'}</p>
          <p className="text-xs text-green-600 font-semibold mt-1">{data.mostProfitable?.margin || 0}% {t('profitability.margin').toLowerCase()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue vs Costs — Top 10 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" /> Top 10 Clientes — Ingresos vs Costos
          </h3>
          {top10.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend />
                <Bar dataKey="revenue" name="Ingresos" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="costs" name="Costos" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">Sin datos</p>}
        </div>

        {/* Margin Trend — 6 months */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" /> Tendencia de Margen — Ultimos 6 meses
          </h3>
          {data.trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trends}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Ingresos" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="costs" name="Costos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" name="Ganancia" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">Sin datos</p>}
        </div>
      </div>

      {/* Client P&L Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" /> {t('profitability.clientPL')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Cliente</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('revenue')}>
                  {t('profitability.revenue')} {sortBy === 'revenue' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('totalHours')}>
                  {t('profitability.hours')} {sortBy === 'totalHours' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('totalCosts')}>
                  {t('profitability.costs')} {sortBy === 'totalCosts' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('grossProfit')}>
                  {t('profitability.profit')} {sortBy === 'grossProfit' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('margin')}>
                  {t('profitability.margin')} {sortBy === 'margin' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">{t('profitability.trend')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedClients.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full', c.status === 'active' ? 'bg-green-400' : 'bg-slate-300')} />
                      <span className="text-sm font-medium text-slate-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">{fmt(c.revenue)}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {c.totalHours}h
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">
                    <div>
                      <span>{fmt(c.totalCosts)}</span>
                      {c.adSpend > 0 && <p className="text-[10px] text-slate-400">Ads: {fmt(c.adSpend)}</p>}
                    </div>
                  </td>
                  <td className={cn('px-4 py-3 text-right text-sm font-semibold', c.grossProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {fmt(c.grossProfit)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                      c.margin >= 30 ? 'bg-green-50 text-green-700' :
                      c.margin >= 15 ? 'bg-amber-50 text-amber-700' :
                      c.margin >= 0 ? 'bg-orange-50 text-orange-700' :
                      'bg-red-50 text-red-700'
                    )}>
                      {c.margin}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TrendArrow value={c.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

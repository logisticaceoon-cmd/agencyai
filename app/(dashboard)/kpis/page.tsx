import { requireAuthWithOrg } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function KPIsPage() {
  const { org } = await requireAuthWithOrg()
  const now = new Date()

  const kpis = await prisma.kPI.findMany({
    where: {
      organizationId: org.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
    include: { client: { select: { id: true, name: true, status: true } } },
    orderBy: { roas: 'desc' },
  })

  const avgRoas = kpis.length
    ? kpis.reduce((s, k) => s + Number(k.roas ?? 0), 0) / kpis.length
    : 0
  const totalInvestment = kpis.reduce((s, k) => s + Number(k.investment ?? 0), 0)
  const totalSales = kpis.reduce((s, k) => s + Number(k.sales ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="KPIs y Métricas"
        description={`Métricas del mes — ${now.toLocaleDateString('es', { month: 'long', year: 'numeric' })}`}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Inversión total</p>
          <p className="text-2xl font-bold text-white">${totalInvestment.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
          <p className="text-xs text-zinc-500 mb-1">Ventas totales</p>
          <p className="text-2xl font-bold text-white">${totalSales.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-center">
          <p className="text-xs text-indigo-300/70 mb-1">ROAS promedio</p>
          <p className={cn('text-2xl font-bold', avgRoas >= 3 ? 'text-green-400' : avgRoas >= 2 ? 'text-yellow-400' : 'text-red-400')}>
            {avgRoas.toFixed(2)}x
          </p>
        </div>
      </div>

      {/* Client KPIs */}
      {kpis.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <BarChart2 className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No hay datos de KPIs para este mes</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Cliente</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Inversión</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Ventas</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">ROAS</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">CPA</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Crecimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900">
              {kpis.map((kpi) => {
                const roas = Number(kpi.roas ?? 0)
                const growth = Number(kpi.growthPct ?? 0)
                return (
                  <tr key={kpi.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{kpi.client?.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-300">
                      ${Number(kpi.investment ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-300">
                      ${Number(kpi.sales ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        roas >= 4 ? 'text-green-400 bg-green-500/10' :
                        roas >= 2.5 ? 'text-yellow-400 bg-yellow-500/10' :
                        'text-red-400 bg-red-500/10'
                      )}>
                        {roas.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400">
                      {kpi.cpa ? `$${Number(kpi.cpa).toFixed(0)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'flex items-center justify-end gap-1 text-xs font-medium',
                        growth > 0 ? 'text-green-400' : growth < 0 ? 'text-red-400' : 'text-zinc-400'
                      )}>
                        {growth > 0 ? <TrendingUp className="h-3 w-3" /> :
                         growth < 0 ? <TrendingDown className="h-3 w-3" /> :
                         <Minus className="h-3 w-3" />}
                        {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

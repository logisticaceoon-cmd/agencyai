'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/store/auth'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FinanceEntry {
  id: string
  type: string
  category: string | null
  description: string
  amount: number
  currency: string
  date: string
  isPaid: boolean
  paymentMethod: string | null
  notes: string | null
  client: { id: string; name: string } | null
}

interface Summary {
  totalIncome: number
  totalExpenses: number
  utility: number
  pendingPayments: number
  month: number
  year: number
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function FinancesPage() {
  const { org } = useAuthStore()
  const [finances, setFinances] = useState<FinanceEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const fetchFinances = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/finances?month=${month}&year=${year}`)
    if (res.ok) {
      const json = await res.json()
      setFinances(json.data || [])
      setSummary(json.summary || null)
    }
    setLoading(false)
  }, [month, year])

  useEffect(() => {
    fetchFinances()
    fetch('/api/clients').then(r => r.json()).then(j => setClients(j.data || []))
  }, [fetchFinances])

  const navigate = (dir: -1 | 1) => {
    let m = month + dir
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setMonth(m)
    setYear(y)
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)

    const res = await fetch('/api/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: form.get('type'),
        category: form.get('category') || undefined,
        description: form.get('description'),
        amount: parseFloat(form.get('amount') as string),
        date: form.get('date'),
        isPaid: form.get('isPaid') === 'on',
        paymentMethod: form.get('paymentMethod') || undefined,
        clientId: form.get('clientId') || undefined,
        notes: form.get('notes') || undefined,
      }),
    })

    if (res.ok) {
      setShowForm(false)
      fetchFinances()
    }
  }

  if (!org) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finanzas"
        description={`${MONTHS[month - 1]} ${year}`}
        action={
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Nuevo registro'}
          </button>
        }
      />

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
          <ChevronLeft className="h-5 w-5 text-zinc-400" />
        </button>
        <span className="text-sm font-medium text-white min-w-[160px] text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
          <ChevronRight className="h-5 w-5 text-zinc-400" />
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tipo *</label>
              <select name="type" required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
                <option value="salary">Sueldo</option>
                <option value="commission">Comisión</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Categoría</label>
              <select name="category" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Seleccionar</option>
                <option value="fee">Fee mensual</option>
                <option value="commission">Comisión</option>
                <option value="salary">Sueldo</option>
                <option value="tool">Herramienta</option>
                <option value="ads_spend">Inversión ads</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Cliente</label>
              <select name="clientId" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Sin cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Descripción *</label>
              <input name="description" required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Fee mensual cliente X..." />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Monto *</label>
              <input name="amount" type="number" step="0.01" required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="1500" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha *</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Método de pago</label>
              <select name="paymentMethod" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Seleccionar</option>
                <option value="transfer">Transferencia</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="cash">Efectivo</option>
                <option value="crypto">Crypto</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input name="isPaid" type="checkbox" className="rounded bg-zinc-800 border-zinc-700" />
                Pagado
              </label>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
              <input name="notes" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Notas..." />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Guardar registro
          </button>
        </form>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <FinCard icon={DollarSign} label="Ingresos del mes" value={`$${summary.totalIncome.toLocaleString()}`} color="text-green-400" bg="bg-green-500/10" />
          <FinCard icon={TrendingDown} label="Gastos del mes" value={`$${summary.totalExpenses.toLocaleString()}`} color="text-red-400" bg="bg-red-500/10" />
          <FinCard
            icon={TrendingUp}
            label="Utilidad neta"
            value={`$${summary.utility.toLocaleString()}`}
            color={summary.utility >= 0 ? 'text-indigo-400' : 'text-red-400'}
            bg={summary.utility >= 0 ? 'bg-indigo-500/10' : 'bg-red-500/10'}
          />
          <FinCard icon={AlertCircle} label="Pagos pendientes" value={`$${summary.pendingPayments.toLocaleString()}`} color="text-yellow-400" bg="bg-yellow-500/10" />
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Movimientos del mes</h2>
          <span className="text-xs text-zinc-500">{finances.length} registros</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />)}</div>
        ) : finances.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            No hay registros financieros para este mes
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {finances.map((f) => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-3">
                <div className={cn('rounded-lg p-1.5 flex-shrink-0', f.type === 'income' || f.type === 'commission' ? 'bg-green-500/10' : 'bg-red-500/10')}>
                  {f.type === 'income' || f.type === 'commission'
                    ? <TrendingUp className="h-4 w-4 text-green-400" />
                    : <TrendingDown className="h-4 w-4 text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{f.description}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {f.client && <span>{f.client.name}</span>}
                    {f.category && <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{f.category}</span>}
                    {f.paymentMethod && <span>{f.paymentMethod}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-medium', f.type === 'income' || f.type === 'commission' ? 'text-green-400' : 'text-red-400')}>
                    {f.type === 'income' || f.type === 'commission' ? '+' : '-'}${Number(f.amount).toLocaleString()} {f.currency}
                  </p>
                  <p className={cn('text-xs', f.isPaid ? 'text-zinc-600' : 'text-yellow-500')}>
                    {f.isPaid ? 'Pagado' : 'Pendiente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FinCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: string; color: string; bg: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className={cn('inline-flex rounded-lg p-1.5 mb-3', bg)}>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  )
}

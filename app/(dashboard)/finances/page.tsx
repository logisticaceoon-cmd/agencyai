'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, X, ChevronLeft, ChevronRight,
  Loader2, Check, Download, FileText, Percent, Receipt, BarChart3, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as Tabs from '@radix-ui/react-tabs'
import { AgentWidget } from '@/components/ai/AgentWidget'
import { InfoBanner } from '@/components/shared/InfoBanner'

interface Transaction {
  id: string; type: string; category: string | null; description: string
  amount: number; currency: string; date: string; client_id: string | null
  project_id: string | null; invoice_id: string | null; created_at: string
  clients?: { id: string; name: string } | null
}

interface Invoice {
  id: string; number: string; status: string; subtotal: number; tax_rate: number
  tax_amount: number; total: number; currency: string; issue_date: string
  due_date: string | null; items: string; notes: string | null; paid_at: string | null
  client_id: string | null; clients?: { id: string; name: string; company: string; email: string } | null
}

interface CommissionClient {
  id: string; name: string; pays_percentage: boolean; percentage_value: number
}

interface Client { id: string; name: string }
interface Project { id: string; name: string }

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function FinancesPage() {
  const [tab, setTab] = useState('resumen')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [commClients, setCommClients] = useState<CommissionClient[]>([])
  const [loading, setLoading] = useState(true)
  const [showTxForm, setShowTxForm] = useState<'income' | 'expense' | null>(null)
  const [showInvForm, setShowInvForm] = useState(false)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [filterType, setFilterType] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [chartData, setChartData] = useState<{name:string;ingresos:number;gastos:number}[]>([])

  // Invoice form state
  const [invClientId, setInvClientId] = useState('')
  const [invDueDate, setInvDueDate] = useState('')
  const [invTaxRate, setInvTaxRate] = useState(0)
  const [invNotes, setInvNotes] = useState('')
  const [invItems, setInvItems] = useState([{ description: '', quantity: 1, unit_price: 0 }])

  // Commission state
  const [invoiceAmounts, setInvoiceAmounts] = useState<Record<string, number>>({})
  const [registeringComm, setRegisteringComm] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txRes, invRes, clientsRes, projRes] = await Promise.all([
      fetch(`/api/finances?month=${month}&year=${year}`),
      fetch('/api/finances/invoices'),
      fetch('/api/clients'),
      fetch('/api/projects'),
    ])
    if (txRes.ok) {
      const j = await txRes.json()
      setTransactions(j.data || [])
      setCommClients(j.commissionClients || [])
    }
    if (invRes.ok) { const j = await invRes.json(); setInvoices(j.data || []) }
    if (clientsRes.ok) { const j = await clientsRes.json(); setClients(j.data || []) }
    if (projRes.ok) { const j = await projRes.json(); setProjects(j.data || []) }

    // Chart data - last 6 months
    const cd: {name:string;ingresos:number;gastos:number}[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const r = await fetch(`/api/finances?month=${m}&year=${y}`)
      if (r.ok) {
        const j = await r.json()
        const inc = (j.data || []).filter((t: Transaction) => t.type === 'income').reduce((s: number, t: Transaction) => s + Number(t.amount), 0)
        const exp = (j.data || []).filter((t: Transaction) => t.type === 'expense').reduce((s: number, t: Transaction) => s + Number(t.amount), 0)
        cd.push({ name: MONTHS[d.getMonth()].substring(0, 3), ingresos: inc, gastos: exp })
      }
    }
    setChartData(cd)
    setLoading(false)
  }, [month, year])

  useEffect(() => { fetchData() }, [fetchData])

  const navigate = (dir: -1 | 1) => {
    let m = month + dir, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setMonth(m); setYear(y)
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const netProfit = totalIncome - totalExpenses
  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + Number(i.total), 0)

  const filteredTx = transactions.filter(t => {
    if (filterType && t.type !== filterType) return false
    if (filterClient && t.client_id !== filterClient) return false
    return true
  })

  async function handleCreateTx(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await fetch('/api/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: fd.get('type'), category: fd.get('category') || undefined,
        description: fd.get('description'), amount: parseFloat(fd.get('amount') as string),
        date: fd.get('date'), clientId: fd.get('clientId') || undefined,
        projectId: fd.get('projectId') || undefined,
      }),
    })
    setShowTxForm(null); fetchData()
  }

  async function handleCreateInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await fetch('/api/finances/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: invClientId || undefined, due_date: invDueDate || undefined,
        tax_rate: invTaxRate, notes: invNotes || undefined, items: invItems,
        status: 'draft',
      }),
    })
    setShowInvForm(false); setInvItems([{ description: '', quantity: 1, unit_price: 0 }])
    setInvTaxRate(0); setInvNotes(''); setInvClientId(''); setInvDueDate(''); fetchData()
  }

  async function updateInvoiceStatus(id: string, status: string) {
    await fetch(`/api/finances/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  function exportCSV() {
    const rows = [['Fecha', 'Tipo', 'Categoria', 'Descripcion', 'Monto', 'Cliente']]
    filteredTx.forEach(t => {
      rows.push([t.date, t.type, t.category || '', t.description, String(t.amount), t.clients?.name || ''])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `transacciones_${month}_${year}.csv`; a.click()
  }

  function getCommCalc(clientId: string, pct: number) {
    return Math.round((invoiceAmounts[clientId] || 0) * (pct / 100) * 100) / 100
  }

  async function registerCommission(c: CommissionClient) {
    const calc = getCommCalc(c.id, c.percentage_value)
    if (calc <= 0) return
    setRegisteringComm(c.id)
    await fetch('/api/finances', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'income', category: 'commission',
        description: `Comision ${c.name} - ${MONTHS[month - 1]} ${year}`,
        amount: calc, date: new Date().toISOString().split('T')[0], clientId: c.id,
      }),
    })
    setRegisteringComm(null); fetchData()
  }

  // Profitability data
  const profitabilityData = clients.map(c => {
    const inc = transactions.filter(t => t.client_id === c.id && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const exp = transactions.filter(t => t.client_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const profit = inc - exp
    const margin = inc > 0 ? (profit / inc) * 100 : 0
    return { ...c, income: inc, expenses: exp, profit, margin }
  }).filter(c => c.income > 0 || c.expenses > 0).sort((a, b) => b.margin - a.margin)

  const invSubtotal = invItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const invTaxAmount = invSubtotal * (invTaxRate / 100)
  const invTotal = invSubtotal + invTaxAmount

  const tabItems = [
    { id: 'resumen', label: 'Resumen', icon: BarChart3 },
    { id: 'transacciones', label: 'Transacciones', icon: Receipt },
    { id: 'facturas', label: 'Facturas', icon: FileText },
    { id: 'comisiones', label: 'Comisiones', icon: Percent },
    { id: 'rentabilidad', label: 'Rentabilidad', icon: Users },
  ]

  return (
    <div className="space-y-6">
      <InfoBanner id="finances" title="Finanzas" description="Controla ingresos, gastos, facturas y comisiones. Analiza la rentabilidad por cliente." />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finanzas</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion financiera completa</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="h-5 w-5 text-slate-500" /></button>
          <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="h-5 w-5 text-slate-500" /></button>
        </div>
      </div>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="flex gap-1 border-b border-slate-200 mb-6">
          {tabItems.map(t => (
            <Tabs.Trigger key={t.id} value={t.id} className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}>
              <t.icon className="h-4 w-4" /> {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* TAB 1: Resumen */}
        <Tabs.Content value="resumen" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={DollarSign} label="Ingresos del mes" value={`$${totalIncome.toLocaleString()}`} color="text-green-600" bg="bg-green-50" border="border-green-200" />
            <KPICard icon={TrendingDown} label="Gastos del mes" value={`$${totalExpenses.toLocaleString()}`} color="text-red-600" bg="bg-red-50" border="border-red-200" />
            <KPICard icon={TrendingUp} label="Ganancia neta" value={`$${netProfit.toLocaleString()}`} color={netProfit >= 0 ? 'text-blue-600' : 'text-red-600'} bg={netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'} border={netProfit >= 0 ? 'border-blue-200' : 'border-red-200'} />
            <KPICard icon={FileText} label="Facturas pendientes" value={`$${pendingInvoices.toLocaleString()}`} color="text-amber-600" bg="bg-amber-50" border="border-amber-200" />
          </div>

          {chartData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Ingresos vs Gastos - Ultimos 6 meses</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-900">Ultimas 10 transacciones</span>
            </div>
            {loading ? <LoadingSkeleton /> : (
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Descripcion</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Monto</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.slice(0, 10).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-sm text-slate-600">{new Date(t.date).toLocaleDateString('es-ES')}</td>
                      <td className="px-5 py-3 text-sm text-slate-800 max-w-[200px] truncate">{t.description}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{t.clients?.name || '-'}</td>
                      <td className="px-5 py-3"><TypeBadge type={t.type} /></td>
                      <td className="px-5 py-3 text-right"><span className={cn('text-sm font-semibold', t.type === 'income' ? 'text-green-600' : 'text-red-600')}>{t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Tabs.Content>

        {/* TAB 2: Transacciones */}
        <Tabs.Content value="transacciones" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Todos los tipos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Gastos</option>
              </select>
              <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Todos los clientes</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Download className="h-4 w-4" /> CSV</button>
              <button onClick={() => setShowTxForm('income')} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700"><Plus className="h-4 w-4" /> Nuevo ingreso</button>
              <button onClick={() => setShowTxForm('expense')} className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700"><Plus className="h-4 w-4" /> Nuevo gasto</button>
            </div>
          </div>

          {showTxForm && (
            <form onSubmit={handleCreateTx} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Nuevo {showTxForm === 'income' ? 'ingreso' : 'gasto'}</h3>
                <button type="button" onClick={() => setShowTxForm(null)}><X className="h-4 w-4 text-slate-400" /></button>
              </div>
              <input type="hidden" name="type" value={showTxForm} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Monto *" name="amount" type="number" step="0.01" required />
                <FormField label="Descripcion *" name="description" required />
                <FormField label="Fecha *" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Cliente</label><select name="clientId" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="">Sin cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Proyecto</label><select name="projectId" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Categoria</label><select name="category" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="">Seleccionar</option><option value="fee">Fee mensual</option><option value="commission">Comision</option><option value="salary">Sueldo</option><option value="tool">Herramienta</option><option value="ads_spend">Inversion ads</option><option value="other">Otro</option></select></div>
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">Guardar</button>
            </form>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Descripcion</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Monto</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTx.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No hay transacciones</td></tr>
                ) : filteredTx.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm text-slate-600">{new Date(t.date).toLocaleDateString('es-ES')}</td>
                    <td className="px-5 py-3"><TypeBadge type={t.type} /></td>
                    <td className="px-5 py-3 text-sm text-slate-500">{t.category || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-800 max-w-[200px] truncate">{t.description}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{t.clients?.name || '-'}</td>
                    <td className="px-5 py-3 text-right"><span className={cn('text-sm font-semibold', t.type === 'income' ? 'text-green-600' : 'text-red-600')}>{t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* TAB 3: Facturas */}
        <Tabs.Content value="facturas" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Facturas</h2>
            <button onClick={() => setShowInvForm(!showInvForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              {showInvForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showInvForm ? 'Cancelar' : 'Nueva factura'}
            </button>
          </div>

          {showInvForm && (
            <form onSubmit={handleCreateInvoice} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Cliente *</label><select value={invClientId} onChange={e => setInvClientId(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="">Seleccionar</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Numero</label><input disabled value="Auto-generado" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-400" /></div>
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Fecha emision</label><input type="date" disabled defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Fecha vencimiento</label><input type="date" value={invDueDate} onChange={e => setInvDueDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
              </div>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead><tr className="bg-slate-50"><th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Descripcion</th><th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 w-24">Cantidad</th><th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 w-32">Precio unit.</th><th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 w-28">Total</th><th className="w-10" /></tr></thead>
                  <tbody>
                    {invItems.map((item, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-4 py-2"><input value={item.description} onChange={e => { const n = [...invItems]; n[i].description = e.target.value; setInvItems(n) }} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm" placeholder="Servicio..." /></td>
                        <td className="px-4 py-2"><input type="number" value={item.quantity} onChange={e => { const n = [...invItems]; n[i].quantity = parseInt(e.target.value) || 0; setInvItems(n) }} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-center" /></td>
                        <td className="px-4 py-2"><input type="number" step="0.01" value={item.unit_price} onChange={e => { const n = [...invItems]; n[i].unit_price = parseFloat(e.target.value) || 0; setInvItems(n) }} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-center" /></td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-slate-700">${(item.quantity * item.unit_price).toLocaleString()}</td>
                        <td className="px-2 py-2">{invItems.length > 1 && <button type="button" onClick={() => setInvItems(invItems.filter((_, j) => j !== i))}><X className="h-4 w-4 text-slate-400" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 border-t border-slate-100">
                  <button type="button" onClick={() => setInvItems([...invItems, { description: '', quantity: 1, unit_price: 0 }])} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Agregar item</button>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="w-32"><label className="text-xs text-slate-500 mb-1 block font-medium">Impuesto %</label><input type="number" step="0.01" value={invTaxRate} onChange={e => setInvTaxRate(parseFloat(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
                <div className="text-right space-y-1">
                  <p className="text-xs text-slate-500">Subtotal: <span className="font-medium text-slate-700">${invSubtotal.toLocaleString()}</span></p>
                  <p className="text-xs text-slate-500">Impuesto: <span className="font-medium text-slate-700">${invTaxAmount.toLocaleString()}</span></p>
                  <p className="text-sm font-bold text-slate-900">Total: ${invTotal.toLocaleString()}</p>
                </div>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block font-medium">Notas</label><textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm h-20 resize-none" /></div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">Guardar borrador</button>
            </form>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Numero</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Emision</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Vencimiento</th>
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">No hay facturas</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{inv.number}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{inv.clients?.name || '-'}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">${Number(inv.total).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center"><InvoiceStatusBadge status={inv.status} /></td>
                    <td className="px-5 py-3 text-sm text-slate-600">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('es-ES') : '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('es-ES') : '-'}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {inv.status === 'draft' && <button onClick={() => updateInvoiceStatus(inv.id, 'sent')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">Enviar</button>}
                        {(inv.status === 'sent' || inv.status === 'overdue') && <button onClick={() => updateInvoiceStatus(inv.id, 'paid')} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">Pagada</button>}
                        <button onClick={() => window.print()} className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded hover:bg-slate-100">PDF</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* TAB 4: Comisiones */}
        <Tabs.Content value="comisiones" className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Comisiones mensuales</h2>
          {commClients.filter(c => c.pays_percentage).length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">No hay clientes con comision configurada. Edita un cliente y activa &quot;Paga por porcentaje&quot;.</div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">% Acordado</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Monto facturado</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Comision</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Accion</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {commClients.filter(c => c.pays_percentage).map(c => {
                    const calc = getCommCalc(c.id, c.percentage_value)
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-sm font-medium text-slate-800">{c.name}</td>
                        <td className="px-5 py-3 text-center"><span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">{c.percentage_value}%</span></td>
                        <td className="px-5 py-3 text-center"><input type="number" step="0.01" value={invoiceAmounts[c.id] || ''} onChange={e => setInvoiceAmounts(prev => ({ ...prev, [c.id]: parseFloat(e.target.value) || 0 }))} className="w-28 mx-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-center" placeholder="0.00" /></td>
                        <td className="px-5 py-3 text-center text-sm font-semibold text-green-600">${calc.toLocaleString()}</td>
                        <td className="px-5 py-3 text-center"><button onClick={() => registerCommission(c)} disabled={registeringComm === c.id || calc <= 0} className="inline-flex items-center gap-1.5 bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">{registeringComm === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Registrar</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tabs.Content>

        {/* TAB 5: Rentabilidad */}
        <Tabs.Content value="rentabilidad" className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Rentabilidad por cliente</h2>
          {profitabilityData.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">No hay datos suficientes para calcular rentabilidad</div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Ingresos</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Gastos</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Ganancia</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Margen %</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {profitabilityData.map(c => (
                      <tr key={c.id} className={cn('hover:bg-slate-50', c.margin > 30 ? 'bg-green-50/50' : c.margin > 10 ? 'bg-amber-50/50' : 'bg-red-50/50')}>
                        <td className="px-5 py-3 text-sm font-medium text-slate-800">{c.name}</td>
                        <td className="px-5 py-3 text-right text-sm text-green-600 font-semibold">${c.income.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-sm text-red-600 font-semibold">${c.expenses.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">${c.profit.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right"><span className={cn('text-sm font-bold', c.margin > 30 ? 'text-green-600' : c.margin > 10 ? 'text-amber-600' : 'text-red-600')}>{c.margin.toFixed(1)}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Rentabilidad por cliente</h3>
                <ResponsiveContainer width="100%" height={Math.max(200, profitabilityData.length * 50)}>
                  <BarChart data={profitabilityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                    <Bar dataKey="margin" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <AgentWidget config={{
        name: 'Agente Financiero',
        description: 'Te ayudo a mejorar la rentabilidad y gestionar el flujo de caja',
        module: 'finances',
        suggestions: ['Como mejoro mi rentabilidad?', 'Cuando debo subir mis precios?', 'Como gestiono clientes que pagan tarde?'],
        context: { ingresos: totalIncome, gastos: totalExpenses, ganancia: netProfit },
      }} />

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-invoice, .print-invoice * { visibility: visible; }
          .print-invoice { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, color, bg, border }: { icon: React.ElementType; label: string; value: string; color: string; bg: string; border: string }) {
  return (
    <div className={cn('rounded-xl border bg-white p-4', border)}>
      <div className={cn('inline-flex rounded-lg p-2 mb-3', bg)}><Icon className={cn('h-4 w-4', color)} /></div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const isIncome = type === 'income'
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
      isIncome ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
    )}>{isIncome ? 'Ingreso' : 'Gasto'}</span>
  )
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
  }
  const labels: Record<string, string> = { draft: 'Borrador', sent: 'Enviada', paid: 'Pagada', overdue: 'Vencida' }
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', styles[status])}>{labels[status] || status}</span>
}

function FormField({ label, name, type = 'text', ...props }: { label: string; name: string; type?: string; [k: string]: unknown }) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block font-medium">{label}</label>
      <input name={name} type={type} {...props} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
  )
}

function LoadingSkeleton() {
  return <div className="p-4 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
}

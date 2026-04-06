'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, X, ChevronLeft, ChevronRight,
  Loader2, Download, BarChart3, FileSignature, Users, Receipt, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as Tabs from '@radix-ui/react-tabs'
import { AgentWidget } from '@/components/ai/AgentWidget'
import { InfoBanner } from '@/components/shared/InfoBanner'

interface Transaction {
  id: string; type: string; category: string | null; description: string
  amount: number; currency: string; date: string; client_id: string | null
  project_id: string | null; created_at: string
  clients?: { id: string; name: string } | null
}

interface Contract {
  id: string; code: string; trafficker_name: string; client_name: string | null
  client_id: string | null; service: string | null; monthly_fee: number
  currency: string; start_date: string | null; end_date: string | null
  status: string; notes: string | null; created_at: string
}

interface PayrollEntry {
  id: string; employee_name: string; role: string | null; base_salary: number
  bonus: number; deductions: number; net_salary: number; currency: string
  period: string | null; pay_date: string | null; status: string
  notes: string | null; created_at: string
}

interface Client { id: string; name: string }

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function FinancesPage() {
  const [tab, setTab] = useState('resumen')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [payroll, setPayroll] = useState<PayrollEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [chartData, setChartData] = useState<{name:string;ingresos:number;gastos:number}[]>([])

  // Forms
  const [showContractForm, setShowContractForm] = useState(false)
  const [showPayrollForm, setShowPayrollForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const currentPeriod = `${year}-${String(month).padStart(2, '0')}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txRes, contractsRes, payrollRes, clientsRes] = await Promise.all([
      fetch(`/api/finances?month=${month}&year=${year}`),
      fetch('/api/finances/contracts'),
      fetch(`/api/finances/payroll?period=${currentPeriod}`),
      fetch('/api/clients'),
    ])
    if (txRes.ok) {
      const j = await txRes.json()
      setTransactions(j.data || [])
    }
    if (contractsRes.ok) { const j = await contractsRes.json(); setContracts(j.data || []) }
    if (payrollRes.ok) { const j = await payrollRes.json(); setPayroll(j.data || []) }
    if (clientsRes.ok) { const j = await clientsRes.json(); setClients(j.data || []) }

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
  }, [month, year, currentPeriod])

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
  const totalContracts = contracts.filter(c => c.status === 'active').reduce((s, c) => s + Number(c.monthly_fee), 0)
  const totalPayroll = payroll.reduce((s, p) => s + Number(p.net_salary), 0)

  const expenseTx = transactions.filter(t => t.type === 'expense')

  async function handleCreateContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await fetch('/api/finances/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: fd.get('code'),
        trafficker_name: fd.get('trafficker_name'),
        client_name: fd.get('client_name') || undefined,
        client_id: fd.get('client_id') || undefined,
        service: fd.get('service') || undefined,
        monthly_fee: parseFloat(fd.get('monthly_fee') as string) || 0,
        start_date: fd.get('start_date') || undefined,
        status: 'active',
      }),
    })
    setShowContractForm(false); fetchData()
  }

  async function handleCreatePayroll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await fetch('/api/finances/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_name: fd.get('employee_name'),
        role: fd.get('role') || undefined,
        base_salary: parseFloat(fd.get('base_salary') as string) || 0,
        bonus: parseFloat(fd.get('bonus') as string) || 0,
        deductions: parseFloat(fd.get('deductions') as string) || 0,
        period: currentPeriod,
        pay_date: fd.get('pay_date') || undefined,
        status: 'pending',
      }),
    })
    setShowPayrollForm(false); fetchData()
  }

  async function handleCreateExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await fetch('/api/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'expense',
        category: fd.get('category') || undefined,
        description: fd.get('description'),
        amount: parseFloat(fd.get('amount') as string),
        date: fd.get('date'),
        clientId: fd.get('clientId') || undefined,
      }),
    })
    setShowExpenseForm(false); fetchData()
  }

  function exportExpensesCSV() {
    const rows = [['Fecha', 'Categoria', 'Descripcion', 'Monto', 'Cliente']]
    expenseTx.forEach(t => {
      rows.push([t.date, t.category || '', t.description, String(t.amount), t.clients?.name || ''])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `gastos_${month}_${year}.csv`; a.click()
  }

  const tabItems = [
    { id: 'resumen', label: 'Resumen', icon: BarChart3 },
    { id: 'contratos', label: 'Contratos', icon: FileSignature },
    { id: 'nominas', label: 'Nominas', icon: Users },
    { id: 'gastos', label: 'Gastos', icon: Receipt },
  ]

  return (
    <div className="space-y-6">
      <InfoBanner id="finances" title="Finanzas" description="Controla contratos, nominas y gastos de tu agencia." />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finanzas</h1>
          <p className="mt-1 text-sm text-slate-500">Contratos, nominas y control de gastos</p>
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
            <KPICard icon={FileSignature} label="Contratos activos" value={`$${totalContracts.toLocaleString()}/mes`} color="text-purple-600" bg="bg-purple-50" border="border-purple-200" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Nomina del mes</h3>
              <p className="text-2xl font-bold text-slate-900">${totalPayroll.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{payroll.length} empleados | Periodo {currentPeriod}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Resumen rapido</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Contratos activos</span><span className="font-semibold text-slate-900">{contracts.filter(c => c.status === 'active').length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Gastos registrados</span><span className="font-semibold text-slate-900">{expenseTx.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Nominas pendientes</span><span className="font-semibold text-slate-900">{payroll.filter(p => p.status === 'pending').length}</span></div>
              </div>
            </div>
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
        </Tabs.Content>

        {/* TAB 2: Contratos (Traffickers) */}
        <Tabs.Content value="contratos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Contratos de Traffickers</h2>
            <button onClick={() => setShowContractForm(!showContractForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              {showContractForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showContractForm ? 'Cancelar' : 'Nuevo contrato'}
            </button>
          </div>

          {showContractForm && (
            <form onSubmit={handleCreateContract} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Codigo *" name="code" placeholder="TD2026-006" required />
                <FormField label="Trafficker *" name="trafficker_name" required />
                <FormField label="Cliente" name="client_name" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Servicio" name="service" placeholder="Meta Ads + Google Ads" />
                <FormField label="Fee mensual *" name="monthly_fee" type="number" step="0.01" required />
                <FormField label="Fecha inicio" name="start_date" type="date" />
              </div>
              <input type="hidden" name="client_id" value="" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">Guardar contrato</button>
            </form>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Codigo</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Trafficker</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Servicio</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Fee/mes</th>
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Inicio</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7}><LoadingSkeleton /></td></tr>
                ) : contracts.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">No hay contratos registrados</td></tr>
                ) : contracts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-medium text-blue-600">{c.code}</td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{c.trafficker_name}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{c.client_name || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{c.service || '-'}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-green-600">${Number(c.monthly_fee).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 text-sm text-slate-500">{c.start_date ? new Date(c.start_date).toLocaleDateString('es-ES') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <p className="text-sm text-purple-800"><span className="font-semibold">Total contratos activos:</span> ${totalContracts.toLocaleString()}/mes ({contracts.filter(c => c.status === 'active').length} contratos)</p>
          </div>
        </Tabs.Content>

        {/* TAB 3: Nominas */}
        <Tabs.Content value="nominas" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Nominas - {MONTHS[month - 1]} {year}</h2>
            <button onClick={() => setShowPayrollForm(!showPayrollForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              {showPayrollForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showPayrollForm ? 'Cancelar' : 'Nueva nomina'}
            </button>
          </div>

          {showPayrollForm && (
            <form onSubmit={handleCreatePayroll} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Empleado *" name="employee_name" required />
                <FormField label="Cargo" name="role" />
                <FormField label="Fecha pago" name="pay_date" type="date" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Salario base *" name="base_salary" type="number" step="0.01" required />
                <FormField label="Bonus" name="bonus" type="number" step="0.01" />
                <FormField label="Deducciones" name="deductions" type="number" step="0.01" />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">Guardar nomina</button>
            </form>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Empleado</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Cargo</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Salario base</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Bonus</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Deducciones</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Neto</th>
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7}><LoadingSkeleton /></td></tr>
                ) : payroll.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">No hay nominas para este periodo</td></tr>
                ) : payroll.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{p.employee_name}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{p.role || '-'}</td>
                    <td className="px-5 py-3 text-right text-sm text-slate-700">${Number(p.base_salary).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm text-green-600">{Number(p.bonus) > 0 ? `+$${Number(p.bonus).toLocaleString()}` : '-'}</td>
                    <td className="px-5 py-3 text-right text-sm text-red-600">{Number(p.deductions) > 0 ? `-$${Number(p.deductions).toLocaleString()}` : '-'}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">${Number(p.net_salary).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center"><PayrollStatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800"><span className="font-semibold">Total nomina del mes:</span> ${totalPayroll.toLocaleString()} ({payroll.length} empleados)</p>
          </div>
        </Tabs.Content>

        {/* TAB 4: Gastos */}
        <Tabs.Content value="gastos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Gastos - {MONTHS[month - 1]} {year}</h2>
            <div className="flex items-center gap-2">
              <button onClick={exportExpensesCSV} className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Download className="h-4 w-4" /> CSV</button>
              <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
                {showExpenseForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showExpenseForm ? 'Cancelar' : 'Nuevo gasto'}
              </button>
            </div>
          </div>

          {showExpenseForm && (
            <form onSubmit={handleCreateExpense} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Monto *" name="amount" type="number" step="0.01" required />
                <FormField label="Descripcion *" name="description" required />
                <FormField label="Fecha *" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Categoria</label>
                  <select name="category" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                    <option value="">Seleccionar</option>
                    <option value="tool">Herramienta</option>
                    <option value="ads_spend">Inversion ads</option>
                    <option value="salary">Sueldo</option>
                    <option value="office">Oficina</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Cliente</label>
                  <select name="clientId" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                    <option value="">Sin cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">Registrar gasto</button>
            </form>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Descripcion</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Monto</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5}><LoadingSkeleton /></td></tr>
                ) : expenseTx.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No hay gastos este mes</td></tr>
                ) : expenseTx.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm text-slate-600">{new Date(t.date).toLocaleDateString('es-ES')}</td>
                    <td className="px-5 py-3"><CategoryBadge category={t.category} /></td>
                    <td className="px-5 py-3 text-sm text-slate-800 max-w-[250px] truncate">{t.description}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{t.clients?.name || '-'}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-red-600">-${Number(t.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800"><span className="font-semibold">Total gastos del mes:</span> ${totalExpenses.toLocaleString()} ({expenseTx.length} transacciones)</p>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <AgentWidget config={{
        name: 'Agente Financiero',
        description: 'Te ayudo a optimizar contratos, nominas y reducir gastos',
        module: 'finances',
        suggestions: ['Como optimizo mis contratos?', 'Que gastos puedo reducir?', 'Como estructuro las nominas?'],
        context: { ingresos: totalIncome, gastos: totalExpenses, ganancia: netProfit, contratos: totalContracts, nomina: totalPayroll },
      }} />
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    completed: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  const labels: Record<string, string> = { active: 'Activo', paused: 'Pausado', cancelled: 'Cancelado', completed: 'Completado' }
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', styles[status] || styles.active)}>{labels[status] || status}</span>
}

function PayrollStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  }
  const labels: Record<string, string> = { pending: 'Pendiente', paid: 'Pagado', cancelled: 'Cancelado' }
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', styles[status] || styles.pending)}>{labels[status] || status}</span>
}

function CategoryBadge({ category }: { category: string | null }) {
  const styles: Record<string, string> = {
    tool: 'bg-blue-50 text-blue-700 border-blue-200',
    ads_spend: 'bg-purple-50 text-purple-700 border-purple-200',
    salary: 'bg-green-50 text-green-700 border-green-200',
    office: 'bg-amber-50 text-amber-700 border-amber-200',
    marketing: 'bg-pink-50 text-pink-700 border-pink-200',
    other: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  const labels: Record<string, string> = { tool: 'Herramienta', ads_spend: 'Ads', salary: 'Sueldo', office: 'Oficina', marketing: 'Marketing', other: 'Otro' }
  const cat = category || 'other'
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', styles[cat] || styles.other)}>{labels[cat] || cat}</span>
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

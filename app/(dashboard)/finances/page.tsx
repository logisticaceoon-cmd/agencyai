'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, X, ChevronLeft, ChevronRight,
  Loader2, Download, BarChart3, FileSignature, Users, Receipt,
  MoreVertical, Pencil, Trash2, FileText, Coins, Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as Tabs from '@radix-ui/react-tabs'
import { AgentWidget } from '@/components/ai/AgentWidget'
import { InfoBanner } from '@/components/shared/InfoBanner'

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

interface Transaction {
  id: string; type: string; category: string | null; description: string
  amount: number; currency: string; date: string; client_id: string | null
  project_id: string | null; created_at: string
  clients?: { id: string; name: string } | null
}

interface Contract {
  id: string; code: string; trafficker_name: string; client_name: string
  service: string | null; monthly_fee: number; currency: string
  commission_percent: number; status: string; start_date: string | null
  notes: string | null; contract_pdf_url: string | null
  deleted_at: string | null; created_at: string; updated_at: string
}

interface MonthlyRecord {
  id: string; contract_id: string; workspace_id: string
  month: number; year: number; monthly_fee: number
  commission_amount: number; currency: string; status: string
  notes: string | null; created_at: string
}

interface PayrollEntry {
  id: string; employee_name: string; role: string | null; base_salary: number
  bonus: number; deductions: number; net_salary: number; currency: string
  period: string | null; pay_date: string | null; status: string
  notes: string | null; created_at: string
}

interface Client { id: string; name: string }

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CURRENCIES = [
  { value: 'USD', symbol: '$', label: 'USD' },
  { value: 'ARS', symbol: '$', label: 'ARS' },
  { value: 'CLP', symbol: '$', label: 'CLP' },
  { value: 'COP', symbol: '$', label: 'COP' },
  { value: 'BRL', symbol: 'R$', label: 'BRL' },
  { value: 'EUR', symbol: '\u20ac', label: 'EUR' },
  { value: 'USDT', symbol: '\u20ae', label: 'USDT' },
  { value: 'VES', symbol: 'Bs', label: 'VES' },
]

function getCurrencySymbol(code: string) {
  return CURRENCIES.find(c => c.value === code)?.symbol || '$'
}

// ═══════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════

export default function FinancesPage() {
  const [tab, setTab] = useState('resumen')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyRecord[]>([])
  const [payroll, setPayroll] = useState<PayrollEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [chartData, setChartData] = useState<{name:string;ingresos:number;gastos:number}[]>([])
  const [showDeleted, setShowDeleted] = useState(false)

  // Forms & modals
  const [showContractForm, setShowContractForm] = useState(false)
  const [showPayrollForm, setShowPayrollForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [closingContract, setClosingContract] = useState<Contract | null>(null)
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const currentPeriod = `${year}-${String(month).padStart(2, '0')}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txRes, contractsRes, payrollRes, clientsRes] = await Promise.all([
      fetch(`/api/finances?month=${month}&year=${year}`),
      fetch(`/api/finances/contracts?month=${month}&year=${year}${showDeleted ? '&include_deleted=true' : ''}`),
      fetch(`/api/finances/payroll?period=${currentPeriod}`),
      fetch('/api/clients'),
    ])
    if (txRes.ok) {
      const j = await txRes.json()
      setTransactions(j.data || [])
    }
    if (contractsRes.ok) {
      const j = await contractsRes.json()
      setContracts(j.data || [])
      setMonthlyRecords(j.monthlyRecords || [])
    }
    if (payrollRes.ok) { const j = await payrollRes.json(); setPayroll(j.data || []) }
    if (clientsRes.ok) { const j = await clientsRes.json(); setClients(j.data || []) }

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
  }, [month, year, currentPeriod, showDeleted])

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
  const activeContracts = contracts.filter(c => c.status === 'active')
  const totalContractFees = activeContracts.reduce((s, c) => s + Number(c.monthly_fee), 0)
  const totalPayroll = payroll.reduce((s, p) => s + Number(p.net_salary), 0)
  const expenseTx = transactions.filter(t => t.type === 'expense')
  const totalMonthlyCommissions = monthlyRecords.reduce((s, r) => s + Number(r.commission_amount), 0)

  function getMonthlyRecord(contractId: string) {
    return monthlyRecords.find(r => r.contract_id === contractId)
  }

  // ═══ Contract handlers ═══

  async function handleCreateContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/finances/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: fd.get('code'),
        trafficker_name: fd.get('trafficker_name'),
        client_name: fd.get('client_name') || '',
        service: fd.get('service') || undefined,
        monthly_fee: parseFloat(fd.get('monthly_fee') as string) || 0,
        currency: fd.get('currency') || 'USD',
        commission_percent: parseFloat(fd.get('commission_percent') as string) || 0,
        start_date: fd.get('start_date') || undefined,
        notes: fd.get('notes') || undefined,
      }),
    })
    if (res.ok) {
      const { data: newContract } = await res.json()
      // Upload PDF if selected
      const pdfFile = fd.get('contract_pdf') as File
      if (pdfFile && pdfFile.size > 0 && newContract?.id) {
        const uploadFd = new FormData()
        uploadFd.append('file', pdfFile)
        uploadFd.append('contract_id', newContract.id)
        await fetch('/api/finances/contracts/upload', { method: 'POST', body: uploadFd })
      }
    }
    setShowContractForm(false); fetchData()
  }

  async function handleEditContract(contractData: Record<string, unknown>, mode: 'this_month' | 'forward') {
    if (!editingContract) return
    if (mode === 'forward') {
      await fetch(`/api/finances/contracts/${editingContract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData),
      })
    } else {
      // Create/update monthly record with overridden values for this month only
      await fetch(`/api/finances/contracts/${editingContract.id}/monthly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          monthly_fee: contractData.monthly_fee,
          commission_amount: (Number(contractData.monthly_fee) * Number(contractData.commission_percent || 0)) / 100,
          currency: contractData.currency,
          status: 'pending',
          notes: `Override solo este mes: ${contractData.notes || ''}`,
        }),
      })
    }
    setEditingContract(null); fetchData()
  }

  async function handleDeleteContract() {
    if (!deletingContract) return
    await fetch(`/api/finances/contracts/${deletingContract.id}`, { method: 'DELETE' })
    setDeletingContract(null); fetchData()
  }

  async function handleCloseMonth(contractId: string, data: { monthly_fee: number; commission_amount: number; currency: string; status: string; notes: string }) {
    await fetch(`/api/finances/contracts/${contractId}/monthly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, ...data }),
    })
    setClosingContract(null); fetchData()
  }

  // ═══ Payroll & Expense handlers ═══

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

  // Expense stats
  const expenseByCategory = expenseTx.reduce<Record<string, number>>((acc, t) => {
    const cat = t.category || 'other'
    acc[cat] = (acc[cat] || 0) + Number(t.amount)
    return acc
  }, {})
  const topExpenseCategory = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0]

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

        {/* ═══ TAB 1: RESUMEN ═══ */}
        <Tabs.Content value="resumen" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={DollarSign} label="Ingresos del mes" value={`$${totalIncome.toLocaleString()}`} color="text-green-600" bg="bg-green-50" border="border-green-200" />
            <KPICard icon={TrendingDown} label="Gastos del mes" value={`$${totalExpenses.toLocaleString()}`} color="text-red-600" bg="bg-red-50" border="border-red-200" />
            <KPICard icon={TrendingUp} label="Ganancia neta" value={`$${netProfit.toLocaleString()}`} color={netProfit >= 0 ? 'text-blue-600' : 'text-red-600'} bg={netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'} border={netProfit >= 0 ? 'border-blue-200' : 'border-red-200'} />
            <KPICard icon={FileSignature} label="Contratos activos" value={`$${totalContractFees.toLocaleString()}/mes`} color="text-purple-600" bg="bg-purple-50" border="border-purple-200" />
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
                <div className="flex justify-between text-sm"><span className="text-slate-500">Contratos activos</span><span className="font-semibold text-slate-900">{activeContracts.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Gastos registrados</span><span className="font-semibold text-slate-900">{expenseTx.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Comisiones del mes</span><span className="font-semibold text-green-600">${totalMonthlyCommissions.toLocaleString()}</span></div>
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

        {/* ═══ TAB 2: CONTRATOS ═══ */}
        <Tabs.Content value="contratos" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-900">Contratos de Traffickers</h2>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded border-slate-300" />
                Mostrar eliminados
              </label>
            </div>
            <button onClick={() => { setShowContractForm(!showContractForm); setEditingContract(null) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              {showContractForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showContractForm ? 'Cancelar' : 'Nuevo contrato'}
            </button>
          </div>

          {showContractForm && (
            <ContractForm onSubmit={handleCreateContract} onCancel={() => setShowContractForm(false)} />
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Codigo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Trafficker</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Servicio</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Fee/mes</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">% Com.</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Com. pagada</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">PDF</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase w-10"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={10}><LoadingSkeleton /></td></tr>
                  ) : contracts.length === 0 ? (
                    <tr><td colSpan={10} className="px-5 py-8 text-center text-sm text-slate-400">No hay contratos registrados</td></tr>
                  ) : contracts.map(c => {
                    const isDeleted = c.status === 'deleted'
                    const record = getMonthlyRecord(c.id)
                    const sym = getCurrencySymbol(c.currency)
                    return (
                      <tr key={c.id} className={cn('hover:bg-slate-50 relative', isDeleted && 'bg-slate-50/80')}>
                        <td className={cn('px-4 py-3 text-sm font-medium text-blue-600', isDeleted && 'line-through text-slate-400')}>{c.code}</td>
                        <td className={cn('px-4 py-3 text-sm font-medium text-slate-800', isDeleted && 'line-through text-slate-400')}>{c.trafficker_name}</td>
                        <td className={cn('px-4 py-3 text-sm text-slate-600', isDeleted && 'line-through text-slate-400')}>{c.client_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{c.service || '-'}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">{sym}{Number(c.monthly_fee).toLocaleString()} <span className="text-[10px] text-slate-400">{c.currency}</span></td>
                        <td className="px-4 py-3 text-center text-sm">{Number(c.commission_percent) > 0 ? <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">{c.commission_percent}%</span> : <span className="text-slate-300">&mdash;</span>}</td>
                        <td className="px-4 py-3 text-right text-sm">{record ? <span className={cn('font-semibold', record.status === 'paid' ? 'text-green-600' : 'text-amber-600')}>{sym}{Number(record.commission_amount).toLocaleString()}</span> : <span className="text-slate-300">&mdash;</span>}</td>
                        <td className="px-4 py-3 text-center">{c.contract_pdf_url ? <a href={c.contract_pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700"><FileText className="h-4 w-4 inline" /></a> : <span className="text-slate-300">&mdash;</span>}</td>
                        <td className="px-4 py-3 text-center"><ContractStatusBadge status={c.status} /></td>
                        <td className="px-4 py-3 text-center relative">
                          {!isDeleted && (
                            <div className="relative inline-block">
                              <button onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)} className="p-1 rounded hover:bg-slate-100"><MoreVertical className="h-4 w-4 text-slate-400" /></button>
                              {menuOpen === c.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                                  <button onClick={() => { setEditingContract(c); setMenuOpen(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Editar contrato</button>
                                  {c.contract_pdf_url && <a href={c.contract_pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setMenuOpen(null)}><FileText className="h-3.5 w-3.5" /> Ver PDF</a>}
                                  <button onClick={() => { setClosingContract(c); setMenuOpen(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Coins className="h-3.5 w-3.5" /> Cierre de mes</button>
                                  <hr className="my-1 border-slate-100" />
                                  <button onClick={() => { setDeletingContract(c); setMenuOpen(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Eliminar contrato</button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {/* TOTALS ROW */}
                  {!loading && contracts.filter(c => c.status === 'active').length > 0 && (
                    <tr className="bg-[#0f172a] text-white">
                      <td className="px-4 py-3 text-sm font-bold">TOTALES</td>
                      <td className="px-4 py-3 text-sm">&mdash;</td>
                      <td className="px-4 py-3 text-sm font-bold">{activeContracts.length} contratos</td>
                      <td className="px-4 py-3 text-sm">&mdash;</td>
                      <td className="px-4 py-3 text-right text-sm font-bold">${totalContractFees.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm">&mdash;</td>
                      <td className="px-4 py-3 text-right text-sm font-bold">${totalMonthlyCommissions.toLocaleString()}</td>
                      <td className="px-4 py-3">&mdash;</td>
                      <td className="px-4 py-3">&mdash;</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && activeContracts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="text-xs text-purple-600 font-medium">Total fees activos</p>
                <p className="text-lg font-bold text-purple-800">${totalContractFees.toLocaleString()}/mes</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs text-green-600 font-medium">Comisiones del mes</p>
                <p className="text-lg font-bold text-green-800">${totalMonthlyCommissions.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs text-blue-600 font-medium">Fee promedio por contrato</p>
                <p className="text-lg font-bold text-blue-800">${activeContracts.length > 0 ? Math.round(totalContractFees / activeContracts.length).toLocaleString() : 0}</p>
              </div>
            </div>
          )}
        </Tabs.Content>

        {/* ═══ TAB 3: NOMINAS ═══ */}
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
                ) : (<>
                  {payroll.map(p => (
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
                  {/* TOTALS ROW */}
                  <tr className="bg-[#0f172a] text-white">
                    <td className="px-5 py-3 text-sm font-bold">TOTAL</td>
                    <td className="px-5 py-3 text-sm">{payroll.length} empleados</td>
                    <td className="px-5 py-3 text-right text-sm font-bold">${payroll.reduce((s, p) => s + Number(p.base_salary), 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold">${payroll.reduce((s, p) => s + Number(p.bonus), 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold">${payroll.reduce((s, p) => s + Number(p.deductions), 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold">${totalPayroll.toLocaleString()}</td>
                    <td className="px-5 py-3"></td>
                  </tr>
                </>)}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* ═══ TAB 4: GASTOS ═══ */}
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
                ) : (<>
                  {expenseTx.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-sm text-slate-600">{new Date(t.date).toLocaleDateString('es-ES')}</td>
                      <td className="px-5 py-3"><CategoryBadge category={t.category} /></td>
                      <td className="px-5 py-3 text-sm text-slate-800 max-w-[250px] truncate">{t.description}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{t.clients?.name || '-'}</td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-red-600">-${Number(t.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* TOTALS ROW */}
                  <tr className="bg-[#0f172a] text-white">
                    <td className="px-5 py-3 text-sm font-bold">TOTAL</td>
                    <td className="px-5 py-3 text-sm">{expenseTx.length} gastos</td>
                    <td className="px-5 py-3" colSpan={2}></td>
                    <td className="px-5 py-3 text-right text-sm font-bold">${totalExpenses.toLocaleString()}</td>
                  </tr>
                </>)}
              </tbody>
            </table>
          </div>

          {!loading && expenseTx.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs text-red-600 font-medium">Total del periodo</p>
                <p className="text-lg font-bold text-red-800">${totalExpenses.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs text-amber-600 font-medium">Promedio por gasto</p>
                <p className="text-lg font-bold text-amber-800">${expenseTx.length > 0 ? Math.round(totalExpenses / expenseTx.length).toLocaleString() : 0}</p>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="text-xs text-purple-600 font-medium">Mayor categoria</p>
                <p className="text-lg font-bold text-purple-800">{topExpenseCategory ? <><CategoryBadge category={topExpenseCategory[0]} /> ${topExpenseCategory[1].toLocaleString()}</> : '-'}</p>
              </div>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* ═══ MODALS ═══ */}

      {/* Close Month Modal */}
      {closingContract && (
        <CloseMonthModal
          contract={closingContract}
          month={month}
          year={year}
          existingRecord={getMonthlyRecord(closingContract.id)}
          onSave={(data) => handleCloseMonth(closingContract.id, data)}
          onClose={() => setClosingContract(null)}
        />
      )}

      {/* Edit Contract Modal */}
      {editingContract && (
        <EditContractModal
          contract={editingContract}
          onSave={handleEditContract}
          onClose={() => setEditingContract(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingContract && (
        <Modal onClose={() => setDeletingContract(null)}>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Eliminar contrato de {deletingContract.client_name || deletingContract.trafficker_name}?</h3>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
            <p className="text-sm text-amber-800">Los registros de meses anteriores se conservaran para el historial.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingContract(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            <button onClick={handleDeleteContract} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar contrato</button>
          </div>
        </Modal>
      )}

      {/* Click outside to close menu */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}

      <AgentWidget config={{
        name: 'Agente Financiero',
        description: 'Te ayudo a optimizar contratos, nominas y reducir gastos',
        module: 'finances',
        suggestions: ['Como optimizo mis contratos?', 'Que gastos puedo reducir?', 'Como estructuro las nominas?'],
        context: { ingresos: totalIncome, gastos: totalExpenses, ganancia: netProfit, contratos: totalContractFees, nomina: totalPayroll },
      }} />
    </div>
  )
}

// ═══════════════════════════════════════
// CONTRACT FORM (Create)
// ═══════════════════════════════════════

function ContractForm({ onSubmit, onCancel }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const [pdfName, setPdfName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Codigo *" name="code" placeholder="TD2026-006" required />
        <FormField label="Trafficker *" name="trafficker_name" required />
        <FormField label="Cliente *" name="client_name" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FormField label="Servicio" name="service" placeholder="Meta Ads + Google Ads" />
        <FormField label="Fee mensual *" name="monthly_fee" type="number" step="0.01" required />
        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Divisa *</label>
          <select name="currency" defaultValue="USD" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.symbol} {c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">% Comision</label>
          <input name="commission_percent" type="number" step="0.01" min="0" max="100" placeholder="0.00" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <p className="text-[10px] text-slate-400 mt-0.5">Porcentaje que cobra el trafficker sobre el fee</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Fecha inicio" name="start_date" type="date" />
        <FormField label="Notas" name="notes" />
        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Contrato PDF (opcional)</label>
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400') }}
            onDragLeave={e => e.currentTarget.classList.remove('border-blue-400')}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400'); const f = e.dataTransfer.files[0]; if (f && f.type === 'application/pdf') { const dt = new DataTransfer(); dt.items.add(f); if (fileRef.current) fileRef.current.files = dt.files; setPdfName(f.name) }}}
          >
            {pdfName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-slate-700">{pdfName}</span>
                <button type="button" onClick={e => { e.stopPropagation(); setPdfName(''); if (fileRef.current) fileRef.current.value = '' }} className="text-slate-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Upload className="h-4 w-4" /> Arrastra el PDF o click para seleccionar
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" name="contract_pdf" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; setPdfName(f?.name || '') }} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">Guardar contrato</button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════
// CLOSE MONTH MODAL
// ═══════════════════════════════════════

function CloseMonthModal({ contract, month, year, existingRecord, onSave, onClose }: {
  contract: Contract; month: number; year: number; existingRecord?: MonthlyRecord
  onSave: (data: { monthly_fee: number; commission_amount: number; currency: string; status: string; notes: string }) => void
  onClose: () => void
}) {
  const [billedAmount, setBilledAmount] = useState(existingRecord ? Number(existingRecord.monthly_fee) : Number(contract.monthly_fee))
  const pct = Number(contract.commission_percent) || 0
  const autoCommission = Math.round(billedAmount * pct / 100 * 100) / 100
  const [commissionAmount, setCommissionAmount] = useState(existingRecord ? Number(existingRecord.commission_amount) : autoCommission)
  const [notes, setNotes] = useState(existingRecord?.notes || '')
  const [paid, setPaid] = useState(existingRecord?.status === 'paid')
  const sym = getCurrencySymbol(contract.currency)

  useEffect(() => {
    if (!existingRecord) {
      setCommissionAmount(autoCommission)
    }
  }, [autoCommission, existingRecord])

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">Cierre de mes &mdash; {contract.client_name || contract.trafficker_name}</h3>
      <p className="text-sm text-slate-500 mb-5">{MONTHS[month - 1]} {year}</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Fee mensual del contrato</p>
            <p className="text-lg font-bold text-slate-900">{sym}{Number(contract.monthly_fee).toLocaleString()} <span className="text-xs text-slate-400">{contract.currency}</span></p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">% de comision</p>
            <p className="text-lg font-bold text-slate-900">{pct}%</p>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Monto facturado este mes</label>
          <input type="number" step="0.01" value={billedAmount} onChange={e => setBilledAmount(parseFloat(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" placeholder={String(contract.monthly_fee)} />
          <p className="text-[10px] text-slate-400 mt-0.5">Ingresa el monto real facturado al cliente este mes</p>
        </div>

        {pct > 0 && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-xs text-green-600">Comision calculada ({pct}% de {sym}{billedAmount.toLocaleString()})</p>
            <p className="text-xl font-bold text-green-700">{sym}{autoCommission.toLocaleString()}</p>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Comision a pagar</label>
          <input type="number" step="0.01" value={commissionAmount} onChange={e => setCommissionAmount(parseFloat(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Notas del cierre</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm h-16 resize-none" />
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPaid(!paid)} className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', paid ? 'bg-green-500' : 'bg-slate-300')}>
            <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', paid ? 'translate-x-6' : 'translate-x-1')} />
          </button>
          <span className="text-sm text-slate-700">{paid ? 'Comision pagada' : 'Pendiente de pago'}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        <button onClick={() => onSave({ monthly_fee: billedAmount, commission_amount: commissionAmount, currency: contract.currency, status: paid ? 'paid' : 'pending', notes })} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar cierre</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════
// EDIT CONTRACT MODAL
// ═══════════════════════════════════════

function EditContractModal({ contract, onSave, onClose }: {
  contract: Contract
  onSave: (data: Record<string, unknown>, mode: 'this_month' | 'forward') => void
  onClose: () => void
}) {
  const [trafficker, setTrafficker] = useState(contract.trafficker_name)
  const [clientName, setClientName] = useState(contract.client_name)
  const [service, setService] = useState(contract.service || '')
  const [fee, setFee] = useState(Number(contract.monthly_fee))
  const [currency, setCurrency] = useState(contract.currency)
  const [commission, setCommission] = useState(Number(contract.commission_percent))
  const [startDate, setStartDate] = useState(contract.start_date || '')
  const [notes, setNotes] = useState(contract.notes || '')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadPdf(contractId: string) {
    if (!pdfFile) return
    const fd = new FormData()
    fd.append('file', pdfFile)
    fd.append('contract_id', contractId)
    await fetch('/api/finances/contracts/upload', { method: 'POST', body: fd })
  }

  function buildData() {
    return {
      trafficker_name: trafficker, client_name: clientName, service, monthly_fee: fee,
      currency, commission_percent: commission, start_date: startDate || undefined,
      notes: notes || undefined, status: contract.status,
    }
  }

  async function handleSave(mode: 'this_month' | 'forward') {
    if (pdfFile) await uploadPdf(contract.id)
    onSave(buildData(), mode)
  }

  if (showConfirm) {
    return (
      <Modal onClose={onClose}>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Como queres aplicar los cambios?</h3>
        <div className="space-y-3">
          <button onClick={() => handleSave('this_month')} className="w-full text-left p-4 rounded-lg border border-slate-200 hover:bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">Solo este mes</p>
            <p className="text-xs text-slate-500 mt-0.5">Crea un registro mensual con los nuevos valores. El contrato base no cambia.</p>
          </button>
          <button onClick={() => handleSave('forward')} className="w-full text-left p-4 rounded-lg border border-slate-200 hover:bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">Este mes y los siguientes</p>
            <p className="text-xs text-slate-500 mt-0.5">Actualiza el contrato base. Los meses anteriores no se tocan.</p>
          </button>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Editar contrato {contract.code}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-slate-500 mb-1 block font-medium">Trafficker *</label><input value={trafficker} onChange={e => setTrafficker(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" required /></div>
          <div><label className="text-xs text-slate-500 mb-1 block font-medium">Cliente *</label><input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-slate-500 mb-1 block font-medium">Servicio</label><input value={service} onChange={e => setService(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
          <div><label className="text-xs text-slate-500 mb-1 block font-medium">Fecha inicio</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="text-xs text-slate-500 mb-1 block font-medium">Fee mensual *</label><input type="number" step="0.01" value={fee} onChange={e => setFee(parseFloat(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block font-medium">Divisa</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.symbol} {c.label}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-slate-500 mb-1 block font-medium">% Comision</label><input type="number" step="0.01" min="0" max="100" value={commission} onChange={e => setCommission(parseFloat(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
        </div>
        <div><label className="text-xs text-slate-500 mb-1 block font-medium">Notas</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm h-16 resize-none" /></div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">PDF del contrato</label>
          {contract.contract_pdf_url && !pdfFile && <p className="text-xs text-blue-500 mb-1"><a href={contract.contract_pdf_url} target="_blank" rel="noopener noreferrer">Ver PDF actual</a></p>}
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400" onClick={() => fileRef.current?.click()}>
            {pdfFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-slate-700">{pdfFile.name}</span>
                <button type="button" onClick={e => { e.stopPropagation(); setPdfFile(null) }}><X className="h-3.5 w-3.5 text-slate-400" /></button>
              </div>
            ) : (
              <span className="text-xs text-slate-400 flex items-center justify-center gap-2"><Upload className="h-4 w-4" /> {contract.contract_pdf_url ? 'Reemplazar PDF' : 'Subir PDF'}</span>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        <button onClick={() => setShowConfirm(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar cambios</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
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

function ContractStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    deleted: 'bg-slate-100 text-slate-400 border-slate-200',
    completed: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  const labels: Record<string, string> = { active: 'Activo', paused: 'Pausado', cancelled: 'Cancelado', deleted: 'Eliminado', completed: 'Completado' }
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

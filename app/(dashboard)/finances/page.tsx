'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, X, ChevronLeft, ChevronRight,
  Download, BarChart3, Users, Receipt, MoreVertical, Pencil, Trash2, FileText,
  Coins, Upload, ChevronDown, ChevronRight as ChevRight, Settings, RotateCcw, Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as Tabs from '@radix-ui/react-tabs'
import { AgentWidget } from '@/components/ai/AgentWidget'
import { InfoBanner } from '@/components/shared/InfoBanner'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { ProGate, UpgradeBanner } from '@/components/shared/ProGate'
import { Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

interface Transaction {
  id: string; type: string; category: string | null; description: string
  amount: number; currency: string; date: string; client_id: string | null
  project_id: string | null; created_at: string
  clients?: { id: string; name: string } | null
}

interface ServiceCategory {
  id: string; name: string; description: string | null; color: string
  icon: string; position: number; created_at: string
}

interface FinanceClient {
  id: string; category_id: string | null; client_name: string; company_name: string | null
  assigned_to: string | null; contract_cost: number; commission_percent: number
  commission_amount: number; currency: string; total_amount: number; cancelled_amount: number
  accounts_count: number; start_date: string | null; status: string
  observations: string | null; contract_pdf_url: string | null; contract_pdf_name: string | null
  deleted_at: string | null; created_at: string; updated_at: string
}

interface ClientMonthly {
  id: string; client_id: string; month: number; year: number
  billed_amount: number; commission_amount: number; currency: string
  status: string; notes: string | null; closed_at: string | null
}

interface PayrollEntry {
  id: string; employee_name: string; role: string | null; base_salary: number
  bonus: number; deductions: number; net_salary: number; currency: string
  period: string | null; pay_date: string | null; status: string
  notes: string | null; created_at: string
}

interface Client { id: string; name: string }

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

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

const CATEGORY_COLORS = [
  { value: '#2563eb', name: 'Azul' },
  { value: '#16a34a', name: 'Verde' },
  { value: '#dc2626', name: 'Rojo' },
  { value: '#ea580c', name: 'Naranja' },
  { value: '#9333ea', name: 'Purpura' },
  { value: '#4f46e5', name: 'Indigo' },
  { value: '#ec4899', name: 'Rosa' },
  { value: '#ca8a04', name: 'Amarillo' },
  { value: '#0d9488', name: 'Teal' },
  { value: '#475569', name: 'Gris' },
]

const CATEGORY_ICONS = ['📊','💼','🎯','🚀','💡','🛒','📱','🎨','💰','📈','🔧','✉️','🌐','📣','🎬','📝','🔑','⚡','🏆','🤝']

const PRESET_CATEGORIES = [
  { icon: '📊', name: 'Tráfico Pago', color: '#2563eb', description: 'Gestión de campañas publicitarias' },
  { icon: '🔑', name: 'Cuenta Inhabilitada', color: '#ea580c', description: 'Recuperación de cuentas' },
  { icon: '💡', name: 'Mentoría', color: '#9333ea', description: 'Asesoría y mentoría personalizada' },
  { icon: '🌐', name: 'Diseño Web', color: '#16a34a', description: 'Desarrollo de sitios web' },
  { icon: '📱', name: 'Social Media', color: '#ec4899', description: 'Gestión de redes sociales' },
  { icon: '📣', name: 'Publicidad', color: '#dc2626', description: 'Campañas y estrategia publicitaria' },
]

const ASSIGNED_COLORS: Record<string, { bg: string; text: string }> = {
  RAFA: { bg: '#dbeafe', text: '#2563eb' },
  RAFAEL: { bg: '#dbeafe', text: '#2563eb' },
  TEFY: { bg: '#dcfce7', text: '#16a34a' },
  STEPHANY: { bg: '#dcfce7', text: '#16a34a' },
}

function getAssignedStyle(name: string | null) {
  if (!name) return { bg: '#f3f4f6', text: '#374151' }
  const upper = name.toUpperCase().trim()
  for (const key of Object.keys(ASSIGNED_COLORS)) {
    if (upper.includes(key)) return ASSIGNED_COLORS[key]
  }
  return { bg: '#f3f4f6', text: '#374151' }
}

function getAssignedBadgeStyle(name: string | null): { background: string; color: string } {
  if (!name) return { background: '#6366f1', color: '#ffffff' }
  const upper = name.toUpperCase().trim()
  if (upper.includes('RAFA')) return { background: '#0891b2', color: '#ffffff' }
  if (upper.includes('TEFY') || upper.includes('STEPH')) return { background: '#f97316', color: '#ffffff' }
  return { background: '#6366f1', color: '#ffffff' }
}

function thStyle(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    textAlign: align,
    padding: '12px 8px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
}

function getCurrencySymbol(code: string) {
  return CURRENCIES.find(c => c.value === code)?.symbol || '$'
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ═══════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════

export default function FinancesPage() {
  const { hasFinanceResumen, hasFinanceNominas, hasFinanceGastos } = usePlanLimits()
  const [tab, setTab] = useState('clientes') // free siempre empieza en clientes
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [financeClients, setFinanceClients] = useState<FinanceClient[]>([])
  const [monthlyRecords, setMonthlyRecords] = useState<ClientMonthly[]>([])
  const [prevMonthlyRecords, setPrevMonthlyRecords] = useState<ClientMonthly[]>([])
  const [payroll, setPayroll] = useState<PayrollEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [chartData, setChartData] = useState<{name:string;ingresos:number;gastos:number}[]>([])
  const [showDeleted, setShowDeleted] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({})

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [showClientModal, setShowClientModal] = useState<{ categoryId: string | null } | null>(null)
  const [editingClient, setEditingClient] = useState<FinanceClient | null>(null)
  const [closingClient, setClosingClient] = useState<FinanceClient | null>(null)
  const [deletingClient, setDeletingClient] = useState<FinanceClient | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showPayrollForm, setShowPayrollForm] = useState(false)
  const [editingPayroll, setEditingPayroll] = useState<PayrollEntry | null>(null)
  const [deletingPayroll, setDeletingPayroll] = useState<PayrollEntry | null>(null)
  const [payrollMenuOpen, setPayrollMenuOpen] = useState<string | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const currentPeriod = `${year}-${String(month).padStart(2, '0')}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    const [txRes, catsRes, clientsRes, payrollRes, clientListRes, prevRes] = await Promise.all([
      fetch(`/api/finances?month=${month}&year=${year}`),
      fetch('/api/finances/categories'),
      fetch(`/api/finances/finance-clients?month=${month}&year=${year}${showDeleted ? '&include_deleted=true' : ''}`),
      fetch(`/api/finances/payroll?period=${currentPeriod}`),
      fetch('/api/clients'),
      fetch(`/api/finances/finance-clients?month=${prevMonth}&year=${prevYear}`),
    ])

    if (txRes.ok) { const j = await txRes.json(); setTransactions(j.data || []) }
    if (catsRes.ok) {
      const j = await catsRes.json()
      setCategories(j.data || [])
      // Auto-expand all categories by default
      const expanded: Record<string, boolean> = {}
      ;(j.data || []).forEach((c: ServiceCategory) => { expanded[c.id] = true })
      setExpandedCats(prev => ({ ...expanded, ...prev }))
    }
    if (clientsRes.ok) {
      const j = await clientsRes.json()
      setFinanceClients(j.data || [])
      setMonthlyRecords(j.monthlyRecords || [])
    }
    if (prevRes.ok) {
      const j = await prevRes.json()
      setPrevMonthlyRecords(j.monthlyRecords || [])
    }
    if (payrollRes.ok) { const j = await payrollRes.json(); setPayroll(j.data || []) }
    if (clientListRes.ok) { const j = await clientListRes.json(); setClients(j.data || []) }

    // Parallel fetches for last 6 months chart data
    const monthPromises = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx
      const d = new Date(year, month - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      return fetch(`/api/finances?month=${m}&year=${y}`).then(async (r) => {
        if (!r.ok) return null
        const j = await r.json()
        const inc = (j.data || []).filter((t: Transaction) => t.type === 'income').reduce((s: number, t: Transaction) => s + Number(t.amount), 0)
        const exp = (j.data || []).filter((t: Transaction) => t.type === 'expense').reduce((s: number, t: Transaction) => s + Number(t.amount), 0)
        return { name: MONTHS[d.getMonth()].substring(0, 3), ingresos: inc, gastos: exp }
      })
    })
    const results = await Promise.all(monthPromises)
    const cd = results.filter((r): r is { name: string; ingresos: number; gastos: number } => r !== null)
    setChartData(cd)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, currentPeriod, showDeleted])

  useEffect(() => { fetchData() }, [fetchData])

  const navigate = (dir: -1 | 1) => {
    let m = month + dir, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setMonth(m); setYear(y)
  }

  // ═══ Derived data ═══

  const getMonthlyRecord = (clientId: string) => monthlyRecords.find(r => r.client_id === clientId)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const netProfit = totalIncome - totalExpenses
  const expenseTx = transactions.filter(t => t.type === 'expense')
  const totalPayroll = payroll.reduce((s, p) => s + Number(p.net_salary), 0)

  const activeClients = useMemo(() => financeClients.filter(c => !c.deleted_at), [financeClients])
  const totalContractCost = activeClients.reduce((s, c) => s + Number(c.contract_cost), 0)
  const totalCommissions = monthlyRecords.reduce((s, r) => s + Number(r.commission_amount), 0)
  const totalBilled = monthlyRecords.reduce((s, r) => s + Number(r.billed_amount), 0)
  const totalCancelled = activeClients.reduce((s, c) => s + Number(c.cancelled_amount), 0)
  const prevBilled = prevMonthlyRecords.reduce((s, r) => s + Number(r.billed_amount), 0)
  const billedChange = prevBilled > 0 ? ((totalBilled - prevBilled) / prevBilled) * 100 : 0

  const clientsByCategory = useMemo(() => {
    const map: Record<string, FinanceClient[]> = {}
    categories.forEach(c => { map[c.id] = [] })
    map.__uncategorized__ = []
    financeClients.forEach(fc => {
      if (showDeleted || !fc.deleted_at) {
        if (fc.category_id && map[fc.category_id]) map[fc.category_id].push(fc)
        else map.__uncategorized__.push(fc)
      }
    })
    return map
  }, [categories, financeClients, showDeleted])

  // ═══ Category handlers ═══

  async function handleSaveCategory(data: { name: string; description: string; color: string; icon: string }) {
    if (editingCategory) {
      await fetch(`/api/finances/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, position: editingCategory.position }),
      })
    } else {
      await fetch('/api/finances/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, position: categories.length }),
      })
    }
    setShowCategoryModal(false); setEditingCategory(null); fetchData()
  }

  async function handleCreatePresets(selected: typeof PRESET_CATEGORIES) {
    await Promise.all(
      selected.map((p, i) =>
        fetch('/api/finances/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...p, position: categories.length + i }),
        })
      )
    )
    fetchData()
  }

  async function handleDeleteCategory(cat: ServiceCategory) {
    if (!confirm(`Eliminar categoria "${cat.name}"?`)) return
    const res = await fetch(`/api/finances/categories/${cat.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json()
      alert(j.error || 'Error al eliminar')
      return
    }
    fetchData()
  }

  // ═══ Client handlers ═══

  async function handleSaveClient(data: Record<string, unknown>, pdfFile: File | null, mode?: 'this_month' | 'forward') {
    let clientId: string | null = null

    try {
      if (editingClient) {
        if (mode === 'this_month') {
          // Only create/update monthly record
          const res = await fetch(`/api/finances/finance-clients/${editingClient.id}/monthly`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              month, year,
              billed_amount: data.contract_cost,
              commission_amount: 0,
              currency: data.currency,
              status: 'pending',
              notes: `Override ${MONTHS[month - 1]} ${year}`,
            }),
          })
          if (!res.ok) {
            const j = await res.json().catch(() => ({ error: 'Error desconocido' }))
            alert('Error al guardar cambios del mes: ' + (j.error || res.statusText))
            return
          }
          clientId = editingClient.id
        } else {
          const res = await fetch(`/api/finances/finance-clients/${editingClient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          if (!res.ok) {
            const j = await res.json().catch(() => ({ error: 'Error desconocido' }))
            alert('Error al actualizar cliente: ' + (j.error || res.statusText))
            return
          }
          const j = await res.json()
          clientId = editingClient.id
          // Optimistic update: reflect changes immediately
          if (j?.data) {
            setFinanceClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...j.data } : c))
          }
        }
      } else {
        const res = await fetch('/api/finances/finance-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({ error: 'Error desconocido' }))
          alert('Error al crear cliente: ' + (j.error || res.statusText))
          return
        }
        const j = await res.json()
        clientId = j.data?.id
      }

      if (clientId && pdfFile) {
        const fd = new FormData()
        fd.append('file', pdfFile)
        fd.append('client_id', clientId)
        await fetch('/api/finances/finance-clients/upload', { method: 'POST', body: fd })
      }
    } catch (err) {
      console.error('Error in handleSaveClient:', err)
      alert('Error inesperado al guardar')
      return
    }

    setShowClientModal(null); setEditingClient(null); await fetchData()
  }

  async function handleDeleteClient() {
    if (!deletingClient) return
    await fetch(`/api/finances/finance-clients/${deletingClient.id}`, { method: 'DELETE' })
    setDeletingClient(null); fetchData()
  }

  async function handleRestoreClient(c: FinanceClient) {
    await fetch(`/api/finances/finance-clients/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: c.category_id, client_name: c.client_name, company_name: c.company_name,
        assigned_to: c.assigned_to, contract_cost: c.contract_cost, commission_percent: c.commission_percent,
        commission_amount: c.commission_amount, currency: c.currency, total_amount: c.total_amount,
        cancelled_amount: c.cancelled_amount, accounts_count: c.accounts_count, start_date: c.start_date,
        status: 'active', observations: c.observations, contract_pdf_url: c.contract_pdf_url,
        contract_pdf_name: c.contract_pdf_name, deleted_at: null,
      }),
    })
    fetchData()
  }

  async function handleCloseMonth(clientId: string, data: { billed_amount: number; commission_amount: number; currency: string; status: string; notes: string }) {
    await fetch(`/api/finances/finance-clients/${clientId}/monthly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, ...data }),
    })
    setClosingClient(null); fetchData()
  }

  // ═══ Payroll & Expense handlers ═══

  async function handleCreatePayroll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await fetch('/api/finances/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_name: fd.get('employee_name'), role: fd.get('role') || undefined,
        base_salary: parseFloat(fd.get('base_salary') as string) || 0,
        bonus: parseFloat(fd.get('bonus') as string) || 0,
        deductions: parseFloat(fd.get('deductions') as string) || 0,
        period: currentPeriod, pay_date: fd.get('pay_date') || undefined, status: 'pending',
      }),
    })
    setShowPayrollForm(false); fetchData()
  }

  async function handleUpdatePayroll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingPayroll) return
    const fd = new FormData(e.currentTarget)
    await fetch('/api/finances/payroll', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingPayroll.id,
        employee_name: fd.get('employee_name'),
        role: fd.get('role') || null,
        base_salary: parseFloat(fd.get('base_salary') as string) || 0,
        bonus: parseFloat(fd.get('bonus') as string) || 0,
        deductions: parseFloat(fd.get('deductions') as string) || 0,
        pay_date: fd.get('pay_date') || null,
        status: fd.get('status') || 'pending',
      }),
    })
    setEditingPayroll(null); fetchData()
  }

  async function handleDeletePayroll(entry: PayrollEntry, fromCurrentForward: boolean) {
    if (fromCurrentForward) {
      await fetch(`/api/finances/payroll?employee_name=${encodeURIComponent(entry.employee_name)}&from_period=${currentPeriod}`, { method: 'DELETE' })
    } else {
      await fetch(`/api/finances/payroll?id=${entry.id}`, { method: 'DELETE' })
    }
    setDeletingPayroll(null); fetchData()
  }

  async function handleCreateExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await fetch('/api/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'expense', category: fd.get('category') || undefined,
        description: fd.get('description'), amount: parseFloat(fd.get('amount') as string),
        date: fd.get('date'), clientId: fd.get('clientId') || undefined,
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

  const expenseByCategory = expenseTx.reduce<Record<string, number>>((acc, t) => {
    const cat = t.category || 'other'
    acc[cat] = (acc[cat] || 0) + Number(t.amount)
    return acc
  }, {})
  const topExpenseCategory = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0]

  const tabItems = [
    { id: 'clientes', label: 'Clientes', icon: Briefcase, locked: false },
    { id: 'resumen',  label: 'Resumen',  icon: BarChart3, locked: !hasFinanceResumen },
    { id: 'nominas',  label: 'Nominas',  icon: Users,     locked: !hasFinanceNominas },
    { id: 'gastos',   label: 'Gastos',   icon: Receipt,   locked: !hasFinanceGastos },
  ]

  function handleTabClick(id: string, locked: boolean) {
    if (locked) return // no cambiar tab si está bloqueado
    setTab(id)
  }

  return (
    <div className="space-y-6">
      <InfoBanner id="finances" title="Finanzas" description="Controla clientes, nominas y gastos de tu agencia." />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finanzas</h1>
          <p className="mt-1 text-sm text-slate-500">Clientes por categoria, nominas y control de gastos</p>
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
            t.locked ? (
              /* Tab bloqueada — link a billing en lugar de cambiar tab */
              <Link
                key={t.id}
                href="/settings/billing"
                title="Función Pro — Activar por $30/mes"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-indigo-500 transition-colors -mb-px"
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 text-indigo-500 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide">
                  <Lock className="h-2 w-2" />
                  Pro
                </span>
              </Link>
            ) : (
              <Tabs.Trigger key={t.id} value={t.id} className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              )}>
                <t.icon className="h-4 w-4" /> {t.label}
              </Tabs.Trigger>
            )
          ))}
        </Tabs.List>

        {/* ═══ TAB RESUMEN ═══ */}
        <Tabs.Content value="resumen" className="space-y-6">
          {!hasFinanceResumen && <UpgradeBanner feature="Resumen financiero" />}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={DollarSign} label="Ingresos del mes" value={`$${totalIncome.toLocaleString()}`} color="text-green-600" bg="bg-green-50" border="border-green-200" />
            <KPICard icon={TrendingDown} label="Gastos del mes" value={`$${totalExpenses.toLocaleString()}`} color="text-red-600" bg="bg-red-50" border="border-red-200" />
            <KPICard icon={TrendingUp} label="Ganancia neta" value={`$${netProfit.toLocaleString()}`} color={netProfit >= 0 ? 'text-blue-600' : 'text-red-600'} bg={netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'} border={netProfit >= 0 ? 'border-blue-200' : 'border-red-200'} />
            <KPICard icon={Briefcase} label="Clientes activos" value={`$${totalContractCost.toLocaleString()}/mes`} color="text-purple-600" bg="bg-purple-50" border="border-purple-200" />
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
                <div className="flex justify-between text-sm"><span className="text-slate-500">Clientes activos</span><span className="font-semibold text-slate-900">{activeClients.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Categorias</span><span className="font-semibold text-slate-900">{categories.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Comisiones del mes</span><span className="font-semibold text-green-600">${totalCommissions.toLocaleString()}</span></div>
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

        {/* ═══ TAB CLIENTES ═══ */}
        <Tabs.Content value="clientes" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-900">Clientes</h2>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded border-slate-300" />
                Mostrar eliminados
              </label>
            </div>
            <div className="flex items-center gap-2">
              {/* Month selector */}
              <div className="hidden md:flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                {MONTHS_SHORT.map((m, i) => (
                  <button key={m} onClick={() => setMonth(i + 1)} className={cn('px-2 py-1 text-[10px] font-semibold rounded transition-colors', month === i + 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>{m}</button>
                ))}
              </div>
              <button onClick={() => { setEditingCategory(null); setShowCategoryModal(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Nueva categoria
              </button>
            </div>
          </div>

          {/* Resume cards */}
          {!loading && activeClients.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Facturado total del mes</p>
                <p className="text-2xl font-bold text-green-700 mt-1">${totalBilled.toLocaleString()}</p>
                {prevBilled > 0 && (
                  <p className={cn('text-xs mt-1 flex items-center gap-1', billedChange >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {billedChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {billedChange.toFixed(1)}% vs mes anterior
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
                <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Comisiones totales del mes</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">${totalCommissions.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {monthlyRecords.filter(r => r.status === 'paid').length} pagadas | {monthlyRecords.filter(r => r.status !== 'paid').length} pendientes
                </p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-4">
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Clientes activos</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{activeClients.length}</p>
                <p className="text-xs text-blue-600 mt-1">{categories.length} categorias</p>
              </div>
            </div>
          )}

          {/* Empty state + preset categories */}
          {!loading && categories.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 mb-1">No tenes categorias aun</h3>
              <p className="text-sm text-slate-500 mb-5">Queres empezar con categorias predefinidas para agencias?</p>
              <PresetPicker onCreate={handleCreatePresets} />
            </div>
          )}

          {/* Categories list */}
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-3">
              {categories.map(cat => {
                const catClients = clientsByCategory[cat.id] || []
                const expanded = expandedCats[cat.id]
                const catRecords = monthlyRecords.filter(r => catClients.some(c => c.id === r.client_id))
                const catTotal = catClients.filter(c => !c.deleted_at).reduce((s, c) => s + Number(c.contract_cost), 0)
                const catCommissions = catRecords.reduce((s, r) => s + Number(r.commission_amount), 0)
                const catCancelled = catClients.filter(c => !c.deleted_at).reduce((s, c) => s + Number(c.cancelled_amount), 0)

                return (
                  <div key={cat.id} className="rounded-xl overflow-hidden" style={{ borderLeft: `4px solid ${cat.color}` }}>
                    {/* Category header */}
                    <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer" style={{ backgroundColor: hexToRgba(cat.color, 0.08) }} onClick={() => setExpandedCats(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}>
                      <div className="flex items-center gap-3">
                        {expanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevRight className="h-4 w-4 text-slate-500" />}
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900" style={{ color: cat.color }}>{cat.name.toUpperCase()}</h3>
                          <p className="text-[11px] text-slate-500">{catClients.filter(c => !c.deleted_at).length} clientes</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">${(catTotal + catCommissions).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">total mensual</p>
                        </div>
                        <button onClick={() => { setShowClientModal({ categoryId: cat.id }); setEditingClient(null) }} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">
                          <Plus className="h-3.5 w-3.5" /> Agregar cliente
                        </button>
                        <button onClick={() => { setEditingCategory(cat); setShowCategoryModal(true) }} className="p-1.5 rounded-lg hover:bg-white/60">
                          <Settings className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                      </div>
                    </div>

                    {/* Category table */}
                    {expanded && (
                      <div className="bg-white border border-slate-200 border-t-0 rounded-b-xl overflow-x-auto">
                        {catClients.length === 0 ? (
                          <p className="text-center text-sm text-slate-400 py-6">No hay clientes en esta categoria</p>
                        ) : (
                          <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', minWidth: '1350px' }}>
                            <colgroup>
                              <col style={{ width: '40px' }} />
                              <col style={{ width: '160px' }} />
                              <col style={{ width: '130px' }} />
                              <col style={{ width: '90px' }} />
                              <col style={{ width: '70px' }} />
                              <col style={{ width: '100px' }} />
                              <col style={{ width: '120px' }} />
                              <col style={{ width: '100px' }} />
                              <col style={{ width: '90px' }} />
                              <col style={{ width: '110px' }} />
                              <col />
                              <col style={{ width: '190px' }} />
                            </colgroup>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={thStyle('center')}>Nº</th>
                                <th style={thStyle('left')}>Clientes</th>
                                <th style={thStyle('right')}>Costo contrato</th>
                                <th style={thStyle('center')}>Comision %</th>
                                <th style={thStyle('center')}>Cuentas</th>
                                <th style={thStyle('center')}>Fecha inicio</th>
                                <th style={thStyle('right')}>Comisión mes</th>
                                <th style={thStyle('right')}>Total</th>
                                <th style={thStyle('right')}>Cancelado</th>
                                <th style={thStyle('center')}>Asignado a</th>
                                <th style={thStyle('left')}>Observacion</th>
                                <th style={thStyle('center')}>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {catClients.map((c, idx) => {
                                const isDeleted = !!c.deleted_at
                                const sym = getCurrencySymbol(c.currency)
                                const rowBg = idx % 2 === 0 ? '#ffffff' : '#fafafa'
                                return (
                                  <tr key={c.id} style={{ background: isDeleted ? '#f8fafc' : rowBg, borderBottom: '1px solid #f1f5f9', opacity: isDeleted ? 0.7 : 1 }}>
                                    <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>{idx + 1}</td>
                                    <td style={{ padding: '10px 8px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textDecoration: isDeleted ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {c.client_name}
                                      {isDeleted && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e2e8f0', color: '#64748b', padding: '1px 6px', borderRadius: '4px' }}>Eliminado</span>}
                                      {c.contract_pdf_url && (
                                        <a href={c.contract_pdf_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '6px', color: '#ef4444', display: 'inline-block', verticalAlign: 'middle' }} title="Ver PDF">
                                          <FileText style={{ width: '13px', height: '13px', display: 'inline' }} />
                                        </a>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: '#334155' }}>{sym}{Number(c.contract_cost).toLocaleString()}</td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                      {Number(c.commission_percent) > 0 ? (
                                        <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>%{c.commission_percent}</span>
                                      ) : <span style={{ color: '#cbd5e1', fontSize: '12px' }}>$0</span>}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>{c.accounts_count}</span>
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                                      {c.start_date ? new Date(c.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                      {(() => {
                                        const rec = getMonthlyRecord(c.id)
                                        if (!rec) return <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                                        const amt = Number(rec.commission_amount)
                                        const isPaid = rec.status === 'paid'
                                        return (
                                          <span style={{
                                            background: isPaid ? '#dcfce7' : '#fef9c3',
                                            color: isPaid ? '#16a34a' : '#854d0e',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            fontFamily: 'monospace',
                                          }}>
                                            {sym}{amt.toLocaleString()}
                                          </span>
                                        )
                                      })()}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                                      {(() => {
                                        const rec = getMonthlyRecord(c.id)
                                        const rowTotal = Number(c.contract_cost) + (rec ? Number(rec.commission_amount) : 0)
                                        return <>{sym}{rowTotal.toLocaleString()}</>
                                      })()}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px' }}>
                                      {Number(c.cancelled_amount) > 0
                                        ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{sym}{Number(c.cancelled_amount).toLocaleString()}</span>
                                        : <span style={{ color: '#cbd5e1' }}>&mdash;</span>}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                      {c.assigned_to ? (
                                        <span style={{ ...getAssignedBadgeStyle(c.assigned_to), borderRadius: '4px', padding: '3px 10px', fontSize: '11px', fontWeight: 800 }}>{c.assigned_to.toUpperCase()}</span>
                                      ) : <span style={{ color: '#cbd5e1' }}>&mdash;</span>}
                                    </td>
                                    <td style={{ padding: '10px 8px' }}>
                                      {c.observations ? (
                                        <div
                                          title={c.observations}
                                          style={{
                                            background: '#dcfce7',
                                            color: '#166534',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            lineHeight: '1.4',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                          }}
                                        >
                                          {c.observations}
                                        </div>
                                      ) : <span style={{ color: '#cbd5e1' }}>&mdash;</span>}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                      {!isDeleted ? (
                                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                          <button
                                            onClick={() => setClosingClient(c)}
                                            title="Cierre de mes"
                                            style={{ background: '#dcfce7', color: '#16a34a', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                          >
                                            💰 Comisión
                                          </button>
                                          <button
                                            onClick={() => { setEditingClient(c); setShowClientModal({ categoryId: c.category_id }) }}
                                            title="Editar cliente"
                                            style={{ background: '#dbeafe', color: '#2563eb', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                          >
                                            ✏️ Editar
                                          </button>
                                          <button
                                            onClick={() => setDeletingClient(c)}
                                            title="Eliminar cliente"
                                            style={{ background: '#fee2e2', color: '#dc2626', padding: '5px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleRestoreClient(c)}
                                          style={{ background: '#dbeafe', color: '#2563eb', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                        >
                                          ↩️ Restaurar
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', color: 'white', fontWeight: 700 }}>
                                <td style={{ padding: '12px 8px', textAlign: 'center', color: '#93c5fd', fontSize: '11px', fontWeight: 800 }}>TOTAL</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: 'white' }}>{catClients.filter(c => !c.deleted_at).length} clientes</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: 'white', fontWeight: 700 }}>${catTotal.toLocaleString()}</td>
                                <td style={{ padding: '12px 8px' }}></td>
                                <td style={{ padding: '12px 8px' }}></td>
                                <td style={{ padding: '12px 8px' }}></td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: '#86efac', fontWeight: 700 }}>${catCommissions.toLocaleString()}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: '#86efac', fontWeight: 700 }}>${(catTotal + catCommissions).toLocaleString()}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: '#fca5a5', fontWeight: 700 }}>${catCancelled.toLocaleString()}</td>
                                <td style={{ padding: '12px 8px' }}></td>
                                <td style={{ padding: '12px 8px' }}></td>
                                <td style={{ padding: '12px 8px' }}></td>
                              </tr>
                            </tfoot>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Uncategorized */}
              {clientsByCategory.__uncategorized__ && clientsByCategory.__uncategorized__.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-600 mb-2">Sin categoria ({clientsByCategory.__uncategorized__.length})</h4>
                  <p className="text-xs text-slate-500">Hay clientes sin categoria. Editalos para asignarlos.</p>
                </div>
              )}
            </div>
          )}

          {/* General totals */}
          {!loading && activeClients.length > 0 && (
            <div className="rounded-xl p-5" style={{ backgroundColor: '#1e3a5f' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-200">Total fees</p>
                  <p className="text-xl font-bold mt-1">${totalContractCost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-200">Total comisiones</p>
                  <p className="text-xl font-bold mt-1">${totalCommissions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-200">Total general</p>
                  <p className="text-xl font-bold mt-1 text-green-300">${(totalContractCost + totalCommissions).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-200">Neto (- cancelados)</p>
                  <p className="text-xl font-bold mt-1 text-green-300">${(totalContractCost + totalCommissions - totalCancelled).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </Tabs.Content>

        {/* ═══ TAB NOMINAS ═══ */}
        <Tabs.Content value="nominas" className="space-y-4">
          {!hasFinanceNominas && <UpgradeBanner feature="Nóminas" />}
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
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase w-16">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8}><LoadingSkeleton /></td></tr>
                ) : payroll.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-400">No hay nominas para este periodo</td></tr>
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
                      <td className="px-5 py-3 text-center">
                        <div className="relative">
                          <button onClick={() => setPayrollMenuOpen(payrollMenuOpen === p.id ? null : p.id)} className="p-1 rounded hover:bg-slate-100">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </button>
                          {payrollMenuOpen === p.id && (
                            <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-44">
                              <button onClick={() => { setEditingPayroll(p); setPayrollMenuOpen(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </button>
                              <button onClick={() => { setDeletingPayroll(p); setPayrollMenuOpen(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#0f172a] text-white">
                    <td className="px-5 py-3 text-sm font-bold">TOTAL</td>
                    <td className="px-5 py-3 text-sm">{payroll.length} empleados</td>
                    <td className="px-5 py-3 text-right text-sm font-bold">${payroll.reduce((s, p) => s + Number(p.base_salary), 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold">${payroll.reduce((s, p) => s + Number(p.bonus), 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold">${payroll.reduce((s, p) => s + Number(p.deductions), 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold">${totalPayroll.toLocaleString()}</td>
                    <td className="px-5 py-3" colSpan={2}></td>
                  </tr>
                </>)}
              </tbody>
            </table>
          </div>

          {/* Modal editar nomina */}
          {editingPayroll && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingPayroll(null)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Editar nomina</h3>
                <form onSubmit={handleUpdatePayroll} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">Empleado *</label>
                      <input name="employee_name" defaultValue={editingPayroll.employee_name} required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">Cargo</label>
                      <input name="role" defaultValue={editingPayroll.role || ''} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">Salario base *</label>
                      <input name="base_salary" type="number" step="0.01" defaultValue={editingPayroll.base_salary} required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">Bonus</label>
                      <input name="bonus" type="number" step="0.01" defaultValue={editingPayroll.bonus} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">Deducciones</label>
                      <input name="deductions" type="number" step="0.01" defaultValue={editingPayroll.deductions} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">Fecha pago</label>
                      <input name="pay_date" type="date" defaultValue={editingPayroll.pay_date || ''} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">Estado</label>
                      <select name="status" defaultValue={editingPayroll.status} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button type="button" onClick={() => setEditingPayroll(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Guardar cambios</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal eliminar nomina */}
          {deletingPayroll && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeletingPayroll(null)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Eliminar nomina</h3>
                    <p className="text-sm text-slate-500">{deletingPayroll.employee_name} - {deletingPayroll.role || 'Sin cargo'}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">Elegi como queres eliminar esta nomina:</p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleDeletePayroll(deletingPayroll, false)}
                    className="w-full text-left rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-900">Solo este mes ({MONTHS[month - 1]} {year})</p>
                    <p className="text-xs text-slate-500 mt-0.5">Elimina solo el registro de este periodo. Los meses anteriores y futuros no se afectan.</p>
                  </button>
                  <button
                    onClick={() => handleDeletePayroll(deletingPayroll, true)}
                    className="w-full text-left rounded-lg border border-red-200 p-4 hover:bg-red-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-red-700">Este mes y todos los futuros</p>
                    <p className="text-xs text-red-500 mt-0.5">Elimina de {MONTHS[month - 1]} {year} en adelante. Los meses anteriores se conservan para el registro historico.</p>
                  </button>
                </div>
                <div className="flex justify-end mt-4">
                  <button onClick={() => setDeletingPayroll(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </Tabs.Content>

        {/* ═══ TAB GASTOS ═══ */}
        <Tabs.Content value="gastos" className="space-y-4">
          {!hasFinanceGastos && <UpgradeBanner feature="Gastos" />}
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

      {/* MODALS */}

      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onDelete={editingCategory ? () => { handleDeleteCategory(editingCategory); setShowCategoryModal(false) } : undefined}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null) }}
        />
      )}

      {showClientModal && (
        <ClientModal
          client={editingClient}
          categoryId={showClientModal.categoryId}
          categories={categories}
          onSave={handleSaveClient}
          onClose={() => { setShowClientModal(null); setEditingClient(null) }}
        />
      )}

      {closingClient && (
        <CloseMonthModal
          client={closingClient}
          month={month}
          year={year}
          existingRecord={getMonthlyRecord(closingClient.id)}
          onSave={(data) => handleCloseMonth(closingClient.id, data)}
          onClose={() => setClosingClient(null)}
        />
      )}

      {deletingClient && (
        <Modal onClose={() => setDeletingClient(null)}>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Eliminar cliente {deletingClient.client_name}?</h3>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
            <p className="text-sm text-amber-800">Los registros de meses anteriores se conservaran en el historial.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingClient(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            <button onClick={handleDeleteClient} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar cliente</button>
          </div>
        </Modal>
      )}

      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}

      <AgentWidget config={{
        name: 'Agente Financiero',
        description: 'Te ayudo a optimizar clientes, nominas y reducir gastos',
        module: 'finances',
        suggestions: ['Como optimizo mis contratos?', 'Que gastos puedo reducir?', 'Como estructuro las nominas?'],
        context: { ingresos: totalIncome, gastos: totalExpenses, ganancia: netProfit, clientes: activeClients.length, nomina: totalPayroll },
      }} />
    </div>
  )
}

// ═══════════════════════════════════════
// PRESET CATEGORIES PICKER
// ═══════════════════════════════════════

function PresetPicker({ onCreate }: { onCreate: (selected: typeof PRESET_CATEGORIES) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set([0, 1, 2]))
  const toggle = (i: number) => {
    const n = new Set(selected)
    if (n.has(i)) n.delete(i); else n.add(i)
    setSelected(n)
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">
        {PRESET_CATEGORIES.map((p, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm transition-all', selected.has(i) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
          >
            {selected.has(i) && <span className="text-blue-500">✓</span>}
            <span>{p.icon}</span>
            <span className="font-medium">{p.name}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => onCreate(PRESET_CATEGORIES.filter((_, i) => selected.has(i)))}
        disabled={selected.size === 0}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium"
      >
        Crear seleccionadas ({selected.size})
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// CATEGORY MODAL
// ═══════════════════════════════════════

function CategoryModal({ category, onSave, onDelete, onClose }: {
  category: ServiceCategory | null
  onSave: (data: { name: string; description: string; color: string; icon: string }) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [color, setColor] = useState(category?.color || '#2563eb')
  const [icon, setIcon] = useState(category?.icon || '📊')

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{category ? 'Editar categoria' : 'Nueva categoria de servicio'}</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ej: Trafico Pago, Mentoria, Diseno Web..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" required />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Descripcion</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Que tipo de servicio incluye?" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm h-16 resize-none" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-2 block font-medium">Color</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map(c => (
              <button key={c.value} type="button" onClick={() => setColor(c.value)} className={cn('w-8 h-8 rounded-lg border-2 transition-all', color === c.value ? 'border-slate-900 scale-110' : 'border-transparent')} style={{ backgroundColor: c.value }} title={c.name} />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-2 block font-medium">Icono</label>
          <div className="grid grid-cols-10 gap-1.5">
            {CATEGORY_ICONS.map(i => (
              <button key={i} type="button" onClick={() => setIcon(i)} className={cn('w-8 h-8 rounded-lg border text-lg flex items-center justify-center transition-all', icon === i ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50')}>{i}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between gap-3 mt-6">
        {onDelete ? (
          <button onClick={onDelete} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Eliminar</button>
        ) : <div />}
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={() => onSave({ name, description, color, icon })} disabled={!name} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{category ? 'Guardar cambios' : 'Crear categoria'}</button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════
// CLIENT MODAL (Create/Edit)
// ═══════════════════════════════════════

function ClientModal({ client, categoryId, categories, onSave, onClose }: {
  client: FinanceClient | null
  categoryId: string | null
  categories: ServiceCategory[]
  onSave: (data: Record<string, unknown>, pdfFile: File | null, mode?: 'this_month' | 'forward') => void
  onClose: () => void
}) {
  const [catId, setCatId] = useState(client?.category_id || categoryId || '')
  const [clientName, setClientName] = useState(client?.client_name || '')
  const [companyName, setCompanyName] = useState(client?.company_name || '')
  const [assignedTo, setAssignedTo] = useState(client?.assigned_to || '')
  const [contractCost, setContractCost] = useState(Number(client?.contract_cost || 0))
  const [currency, setCurrency] = useState(client?.currency || 'USD')
  const [commissionPct, setCommissionPct] = useState(Number(client?.commission_percent || 0))
  const [accountsCount, setAccountsCount] = useState(Number(client?.accounts_count || 1))
  const [startDate, setStartDate] = useState(client?.start_date || '')
  const [status, setStatus] = useState(client?.status || 'active')
  const [cancelledAmount, setCancelledAmount] = useState(Number(client?.cancelled_amount || 0))
  const [observations, setObservations] = useState(client?.observations || '')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [showModeConfirm, setShowModeConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const commissionAmount = Math.round(contractCost * commissionPct / 100 * 100) / 100
  const total = contractCost
  const sym = getCurrencySymbol(currency)

  function buildData() {
    return {
      category_id: catId || null, client_name: clientName, company_name: companyName,
      assigned_to: assignedTo, contract_cost: contractCost, commission_percent: commissionPct,
      commission_amount: commissionAmount, currency, total_amount: total,
      cancelled_amount: cancelledAmount, accounts_count: accountsCount,
      start_date: startDate || null, status, observations,
    }
  }

  function handleSave() {
    if (client) {
      setShowModeConfirm(true)
    } else {
      onSave(buildData(), pdfFile)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type === 'application/pdf') setPdfFile(f)
  }

  if (showModeConfirm) {
    return (
      <Modal onClose={() => setShowModeConfirm(false)}>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Como aplicar los cambios?</h3>
        <div className="space-y-3">
          <button onClick={() => onSave(buildData(), pdfFile, 'this_month')} className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50">
            <p className="text-sm font-semibold text-slate-900">Solo este mes</p>
            <p className="text-xs text-slate-500 mt-0.5">Crea un registro mensual con los nuevos valores. El cliente base no cambia.</p>
          </button>
          <button onClick={() => onSave(buildData(), pdfFile, 'forward')} className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50">
            <p className="text-sm font-semibold text-slate-900">Este mes y los siguientes</p>
            <p className="text-xs text-slate-500 mt-0.5">Actualiza el cliente base. Los meses anteriores no se tocan.</p>
          </button>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setShowModeConfirm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} size="xl">
      <h3 className="text-lg font-semibold text-slate-900 mb-5">{client ? `Editar ${client.client_name}` : 'Nuevo cliente'}</h3>

      <div className="space-y-5">
        {/* SECCION 1: Datos basicos */}
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Datos basicos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Categoria</label>
              <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                <option value="">Sin categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Cliente / Nombre empresa *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" required />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Empresa (opcional)</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Asignado a *</label>
              <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="RAFA, TEFY, ..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>
        </div>

        {/* SECCION 2: Contrato financiero */}
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Contrato financiero</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Costo contrato</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={contractCost === 0 ? '' : contractCost}
                onChange={e => {
                  const val = e.target.value
                  setContractCost(val === '' ? 0 : parseFloat(val) || 0)
                }}
                onFocus={e => { if (e.target.value === '0') e.target.select() }}
                placeholder="0.00"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Divisa</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.symbol} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">% Comision sobre ventas</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={commissionPct === 0 ? '' : commissionPct}
                onChange={e => {
                  const val = e.target.value
                  setCommissionPct(val === '' ? 0 : parseFloat(val) || 0)
                }}
                onFocus={e => { if (e.target.value === '0') e.target.select() }}
                placeholder="0.00"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">Este % se aplica sobre el total de ventas del cliente al cierre del mes, no sobre el fee mensual.</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Cuentas activas</label>
              <input
                type="number"
                min="0"
                step="1"
                value={accountsCount === 0 ? '' : accountsCount}
                onChange={e => {
                  const val = e.target.value
                  setAccountsCount(val === '' ? 0 : parseInt(val) || 0)
                }}
                onFocus={e => { if (e.target.value === '0') e.target.select() }}
                placeholder="0"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Fecha inicio</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block font-medium">Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECCION 3: Totales calculados */}
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Totales calculados</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 col-span-2">
              <p className="text-xs text-amber-700 font-semibold uppercase">Comision por ventas</p>
              <p className="text-xs text-amber-900 mt-1">La comision se calcula al cierre del mes sobre el total de ventas. Usa el boton &quot;Cerrar mes&quot; para registrar el monto real.</p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-[10px] text-blue-600 uppercase font-semibold">Total</p>
              <p className="text-base font-bold text-blue-700">{sym}{total.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-[10px] text-red-600 uppercase font-semibold block mb-1">Monto cancelado</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cancelledAmount === 0 ? '' : cancelledAmount}
                onChange={e => {
                  const val = e.target.value
                  setCancelledAmount(val === '' ? 0 : parseFloat(val) || 0)
                }}
                onFocus={e => { if (e.target.value === '0') e.target.select() }}
                placeholder="0.00"
                className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* SECCION 4: Observaciones */}
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Observaciones</h4>
          <textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder="ej: 300.000CLP + 3.5% COMISION DE VENTAS DEL ADMIN DESCONTANDO INVERSION EN ANUNCIOS Y EL 4% SI SUPERA LOS 50MILL"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] italic text-slate-600 min-h-[100px] resize-y"
          />
        </div>

        {/* SECCION 5: PDF */}
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Contrato PDF</h4>
          {client?.contract_pdf_url && !pdfFile && (
            <div className="mb-2 flex items-center gap-2 text-xs">
              <FileText className="h-4 w-4 text-red-500" />
              <a href={client.contract_pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{client.contract_pdf_name || 'Ver PDF actual'}</a>
            </div>
          )}
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            {pdfFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                <span className="text-sm text-slate-700">{pdfFile.name}</span>
                <span className="text-xs text-slate-400">({(pdfFile.size / 1024).toFixed(0)} KB)</span>
                <button type="button" onClick={e => { e.stopPropagation(); setPdfFile(null) }} className="text-slate-400 hover:text-red-500 ml-2"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <span className="text-2xl">📄</span>
                <p className="text-xs">Arrastra el PDF del contrato o hace click para seleccionar</p>
                <p className="text-[10px] text-slate-300">Solo .pdf, max 10MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && f.size <= 10 * 1024 * 1024) setPdfFile(f) }} />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        <button onClick={handleSave} disabled={!clientName} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Guardar cliente</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════
// CLOSE MONTH MODAL
// ═══════════════════════════════════════

function CloseMonthModal({ client, month, year, existingRecord, onSave, onClose }: {
  client: FinanceClient; month: number; year: number; existingRecord?: ClientMonthly
  onSave: (data: { billed_amount: number; commission_amount: number; currency: string; status: string; notes: string }) => void
  onClose: () => void
}) {
  const [billedAmount, setBilledAmount] = useState<number>(existingRecord ? Number(existingRecord.billed_amount) : 0)
  const [commissionAmount, setCommissionAmount] = useState<number>(existingRecord ? Number(existingRecord.commission_amount) : 0)
  const [notes, setNotes] = useState(existingRecord?.notes || '')
  const [paid, setPaid] = useState(existingRecord?.status === 'paid')
  const pct = Number(client.commission_percent) || 0
  const sym = getCurrencySymbol(client.currency)

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">Cierre de mes &mdash; {client.client_name}</h3>
      <p className="text-sm text-slate-500 mb-5">{MONTHS[month - 1]} {year}</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Fee contractual</p>
            <p className="text-lg font-bold text-slate-900">{sym}{Number(client.contract_cost).toLocaleString()} <span className="text-xs text-slate-400">{client.currency}</span></p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">% comision (referencial)</p>
            <p className="text-lg font-bold text-slate-900">{pct > 0 ? `${pct}%` : '—'}</p>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            ℹ️ El % de comision es solo referencial. Ingresa el monto real que calculaste desde la plataforma del cliente.
          </p>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Total de ventas del cliente ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={billedAmount === 0 ? '' : billedAmount}
            onChange={e => { const v = e.target.value; setBilledAmount(v === '' ? 0 : parseFloat(v) || 0) }}
            onFocus={e => { if (e.target.value === '0') e.target.select() }}
            placeholder="0.00"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
          />
          <p className="text-[10px] text-slate-400 mt-0.5">Total de ventas generadas por el cliente. La comision la calculas tu desde su plataforma.</p>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Comision a cobrar este mes ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={commissionAmount === 0 ? '' : commissionAmount}
            onChange={e => { const v = e.target.value; setCommissionAmount(v === '' ? 0 : parseFloat(v) || 0) }}
            onFocus={e => { if (e.target.value === '0') e.target.select() }}
            placeholder="0.00"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
          />
          <p className="text-[10px] text-slate-400 mt-0.5">Monto real a cobrar. Calcula manualmente segun lo acordado con el cliente.</p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPaid(!paid)} className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', paid ? 'bg-green-500' : 'bg-slate-300')}>
            <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', paid ? 'translate-x-6' : 'translate-x-1')} />
          </button>
          <span className="text-sm text-slate-700">{paid ? '✅ Comision pagada' : '⏳ Pendiente de pago'}</span>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Notas del cierre</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm h-16 resize-none" />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        <button onClick={() => onSave({ billed_amount: billedAmount, commission_amount: commissionAmount, currency: client.currency, status: paid ? 'paid' : 'pending', notes })} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar cierre del mes</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════

function Modal({ onClose, children, size = 'lg' }: { onClose: () => void; children: React.ReactNode; size?: 'lg' | 'xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={cn('bg-white rounded-xl shadow-xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto', size === 'xl' ? 'max-w-3xl' : 'max-w-lg')} onClick={e => e.stopPropagation()}>
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

'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Receipt, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Invoice { id: string; number: string; status: string; total: number; currency: string; issue_date: string; due_date: string | null }

const STATUS_LABELS: Record<string, string> = { sent: 'Enviada', paid: 'Pagada', overdue: 'Vencida' }
const STATUS_COLORS: Record<string, string> = { sent: 'bg-blue-50 text-blue-700', paid: 'bg-green-50 text-green-700', overdue: 'bg-red-50 text-red-700' }

export default function PortalInvoicesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/portal/${token}/invoices`).then(r => r.json()).then(j => setInvoices(j.data || [])).finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 text-blue-600 animate-spin" /></div>

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Link href={`/portal/${token}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-6"><ArrowLeft className="h-4 w-4" /> Volver al portal</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Facturas</h1>
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">No hay facturas disponibles</div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Numero</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Emision</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Vencimiento</th>
                <th className="w-20" />
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{inv.number}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{inv.currency} ${Number(inv.total).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center"><span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[inv.status])}>{STATUS_LABELS[inv.status] || inv.status}</span></td>
                    <td className="px-5 py-3 text-sm text-slate-600">{new Date(inv.issue_date).toLocaleDateString('es-ES')}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('es-ES') : '-'}</td>
                    <td className="px-5 py-3"><button onClick={() => window.print()} className="text-xs text-blue-600 hover:text-blue-700 font-medium">PDF</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

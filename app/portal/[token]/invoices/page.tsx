'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Receipt,
  Loader2,
  CreditCard,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Invoice {
  id: string
  number: string
  status: string
  total: number
  currency: string
  issue_date: string
  due_date: string | null
  items: unknown
  notes: string | null
}

const STATUS_LABELS: Record<string, string> = {
  sent: 'Pendiente',
  paid: 'Pagada',
  overdue: 'Vencida',
  draft: 'Borrador',
}

const STATUS_CONFIG: Record<string, { class: string; icon: typeof Clock }> = {
  sent: { class: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  paid: { class: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  overdue: { class: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
}

export default function PortalInvoicesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)
  const [portalData, setPortalData] = useState<{ accentColor: string; agencyName: string; logoUrl: string | null } | null>(null)

  useEffect(() => {
    // Check for Stripe return
    const urlParams = new URLSearchParams(window.location.search)
    const paidId = urlParams.get('paid')
    if (paidId) {
      setPaymentSuccess(paidId)
      setTimeout(() => setPaymentSuccess(null), 3000)
      window.history.replaceState({}, '', window.location.pathname)
    }

    Promise.all([
      fetch(`/api/portal/${token}`).then(r => r.json()),
      fetch(`/api/portal/${token}/invoices`).then(r => r.json()),
    ]).then(([portalRes, invoicesRes]) => {
      if (portalRes.data) {
        setPortalData({
          accentColor: portalRes.data.workspaces?.primary_color || '#2563eb',
          agencyName: portalRes.data.workspaces?.name || 'Agencia',
          logoUrl: portalRes.data.workspaces?.logo_url || null,
        })
      }
      setInvoices(invoicesRes.data || [])
    }).finally(() => setLoading(false))

    // Log activity
    fetch(`/api/portal/${token}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'viewed_invoices', entity_type: 'invoice' }),
    }).catch(() => {})
  }, [token])

  const handlePay = async (invoiceId: string) => {
    setPaymentProcessing(true)
    try {
      const res = await fetch(`/api/portal/${token}/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (data.url) {
        // Real Stripe: redirect to checkout
        window.location.href = data.url
        return
      }

      if (data.success && data.mock) {
        // Mock mode: update locally
        setInvoices(prev =>
          prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'paid' } : inv)
        )
        setPaymentSuccess(invoiceId)
        setTimeout(() => {
          setPayingInvoiceId(null)
          setPaymentSuccess(null)
          setPaymentProcessing(false)
        }, 2000)
        return
      }

      alert(data.error || 'Error al procesar el pago')
      setPaymentProcessing(false)
    } catch {
      setPaymentProcessing(false)
    }
  }

  const accentColor = portalData?.accentColor || '#2563eb'
  const unpaidTotal = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {portalData?.logoUrl ? (
                <img src={portalData.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: accentColor }}>
                  {(portalData?.agencyName || 'A').charAt(0)}
                </div>
              )}
              <p className="text-sm font-bold text-slate-900 hidden sm:block">{portalData?.agencyName}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link href={`/portal/${token}`} className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">Inicio</Link>
              <Link href={`/portal/${token}/reports`} className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">Reportes</Link>
              <Link href={`/portal/${token}/invoices`} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: accentColor, backgroundColor: `${accentColor}10` }}>Facturas</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link href={`/portal/${token}`} className="inline-flex items-center gap-2 text-sm hover:opacity-80 mb-6" style={{ color: accentColor }}>
          <ArrowLeft className="h-4 w-4" /> Volver al portal
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
              <Receipt className="h-5 w-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Facturas</h1>
              <p className="text-sm text-slate-500">Consulta y paga tus facturas</p>
            </div>
          </div>
          {unpaidTotal > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Total pendiente</p>
              <p className="text-lg font-bold text-slate-900">${unpaidTotal.toLocaleString()}</p>
            </div>
          )}
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No hay facturas disponibles</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {invoices.map(inv => {
                const statusConf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.sent
                const StatusIcon = statusConf.icon
                const canPay = inv.status === 'sent' || inv.status === 'overdue'

                return (
                  <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-900">{inv.number}</p>
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border', statusConf.class)}>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-slate-900 mb-1">{inv.currency} ${Number(inv.total).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mb-3">
                      Emision: {new Date(inv.issue_date).toLocaleDateString('es-ES')}
                      {inv.due_date && ` | Vence: ${new Date(inv.due_date).toLocaleDateString('es-ES')}`}
                    </p>
                    {canPay && (
                      <button
                        onClick={() => setPayingInvoiceId(inv.id)}
                        className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        <CreditCard className="h-4 w-4" />
                        Pagar ahora
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Numero</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Emision</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Vencimiento</th>
                    <th className="w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => {
                    const statusConf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.sent
                    const StatusIcon = statusConf.icon
                    const canPay = inv.status === 'sent' || inv.status === 'overdue'

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{inv.number}</td>
                        <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-900">
                          {inv.currency} ${Number(inv.total).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border', statusConf.class)}>
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_LABELS[inv.status] || inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">
                          {new Date(inv.issue_date).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString('es-ES') : '-'}
                        </td>
                        <td className="px-5 py-3.5">
                          {canPay ? (
                            <button
                              onClick={() => setPayingInvoiceId(inv.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
                              style={{ backgroundColor: accentColor }}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pagar
                            </button>
                          ) : (
                            <button
                              onClick={() => window.print()}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              PDF
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Payment Modal */}
      {payingInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
            {!paymentProcessing && !paymentSuccess && (
              <button
                onClick={() => setPayingInvoiceId(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {paymentSuccess ? (
              <div className="text-center py-4">
                <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Pago exitoso</h3>
                <p className="text-sm text-slate-500">Tu factura ha sido marcada como pagada.</p>
              </div>
            ) : paymentProcessing ? (
              <div className="text-center py-8">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" style={{ color: accentColor }} />
                <h3 className="text-lg font-bold text-slate-900 mb-1">Redirigiendo a pago seguro...</h3>
                <p className="text-sm text-slate-500">Procesando tu pago de forma segura.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${accentColor}15` }}>
                    <CreditCard className="h-7 w-7" style={{ color: accentColor }} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Confirmar pago</h3>
                  {(() => {
                    const inv = invoices.find(i => i.id === payingInvoiceId)
                    return inv ? (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Factura {inv.number}</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {inv.currency} ${Number(inv.total).toLocaleString()}
                        </p>
                      </div>
                    ) : null
                  })()}
                </div>
                <button
                  onClick={() => handlePay(payingInvoiceId)}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-3 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: accentColor }}
                >
                  <CreditCard className="h-4 w-4" />
                  Pagar ahora
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-3">
                  Pago procesado de forma segura via Stripe.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

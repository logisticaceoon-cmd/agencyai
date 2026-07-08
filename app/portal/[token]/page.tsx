'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { use } from 'react'
import {
  FolderKanban,
  FileText,
  Receipt,
  Loader2,
  Package,
  Upload,
  ArrowRight,
  DollarSign,
  Clock,
} from 'lucide-react'

interface PortalData {
  access_token: string
  permissions: { projects?: boolean; reports?: boolean; invoices?: boolean }
  clients: { id: string; name: string; company: string } | null
  workspaces: {
    id: string
    name: string
    logo_url: string | null
    primary_color: string | null
    portal_welcome_message: string | null
  } | null
  counts: {
    active_projects: number
    reports: number
    unpaid_invoices: number
    unpaid_total: number
    pending_deliverables: number
  }
}

function PortalNav({ token, agencyName, logoUrl, accentColor }: {
  token: string
  agencyName: string
  logoUrl: string | null
  accentColor: string
}) {
  const links = [
    { href: `/portal/${token}`, label: 'Inicio' },
    { href: `/portal/${token}/projects`, label: 'Proyectos' },
    { href: `/portal/${token}/reports`, label: 'Reportes' },
    { href: `/portal/${token}/invoices`, label: 'Facturas' },
    { href: `/portal/${token}/deliverables`, label: 'Entregables' },
    { href: `/portal/${token}/briefs`, label: 'Briefs' },
  ]

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={agencyName} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: accentColor }}
              >
                {agencyName.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{agencyName}</p>
              <p className="text-[10px] text-slate-400">Portal del cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState<Array<{ id: string; action: string; entity_type: string | null; created_at: string }>>([])

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) setError(j.error)
        else setData(j.data)
      })
      .catch(() => setError('Error de conexion'))
      .finally(() => setLoading(false))

    fetch(`/api/portal/${token}/activity?limit=10`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setActivity(j.data || []))
      .catch(() => {})
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-lg font-semibold text-slate-900">Acceso no valido</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    </div>
  )

  const perms = data?.permissions || {}
  const agencyName = data?.workspaces?.name || 'Agencia'
  const clientName = data?.clients?.name || 'Cliente'
  const accentColor = data?.workspaces?.primary_color || '#2563eb'
  const logoUrl = data?.workspaces?.logo_url || null
  const welcomeMessage = data?.workspaces?.portal_welcome_message || `Accede a la informacion de tu cuenta con ${agencyName}.`
  const counts = data?.counts || { active_projects: 0, reports: 0, unpaid_invoices: 0, unpaid_total: 0, pending_deliverables: 0 }

  const dashboardCards = [
    {
      href: `/portal/${token}/projects`,
      label: 'Proyectos Activos',
      icon: FolderKanban,
      count: counts.active_projects,
      subtitle: counts.active_projects === 1 ? 'proyecto en curso' : 'proyectos en curso',
      enabled: perms.projects,
    },
    {
      href: `/portal/${token}/reports`,
      label: 'Reportes',
      icon: FileText,
      count: counts.reports,
      subtitle: counts.reports === 1 ? 'reporte disponible' : 'reportes disponibles',
      enabled: perms.reports,
    },
    {
      href: `/portal/${token}/invoices`,
      label: 'Facturas Pendientes',
      icon: Receipt,
      count: counts.unpaid_invoices,
      subtitle: counts.unpaid_total > 0 ? `$${counts.unpaid_total.toLocaleString()} por pagar` : 'todo al dia',
      enabled: perms.invoices,
      highlight: counts.unpaid_invoices > 0,
    },
    {
      href: `/portal/${token}/deliverables`,
      label: 'Entregables por Revisar',
      icon: Package,
      count: counts.pending_deliverables,
      subtitle: counts.pending_deliverables === 1 ? 'entregable pendiente' : 'entregables pendientes',
      enabled: true,
      highlight: counts.pending_deliverables > 0,
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav
        token={token}
        agencyName={agencyName}
        logoUrl={logoUrl}
        accentColor={accentColor}
      />

      {/* Hero Section */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Bienvenido, {clientName}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl">{welcomeMessage}</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashboardCards.filter(c => c.enabled).map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-all"
              style={{ borderColor: card.highlight ? accentColor : undefined }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <card.icon className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{card.count}</p>
              <p className="text-xs text-slate-500">{card.subtitle}</p>
            </Link>
          ))}
        </div>

        {/* CTA - Upload Brief */}
        <Link
          href={`/portal/${token}/briefs`}
          className="block rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 sm:p-8 hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <Upload className="h-6 w-6" style={{ color: accentColor }} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900 mb-1">Enviar un Brief</h3>
              <p className="text-sm text-slate-500">
                Sube documentos, referencias o instrucciones para tu proximo proyecto.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors hidden sm:block" />
          </div>
        </Link>

        {/* Quick summary for invoices if there are unpaid */}
        {perms.invoices && counts.unpaid_invoices > 0 && (
          <div
            className="mt-6 rounded-xl p-4 flex items-center gap-3"
            style={{ backgroundColor: `${accentColor}08`, borderLeft: `3px solid ${accentColor}` }}
          >
            <DollarSign className="h-5 w-5 flex-shrink-0" style={{ color: accentColor }} />
            <p className="text-sm text-slate-700">
              Tienes <span className="font-semibold">{counts.unpaid_invoices}</span> {counts.unpaid_invoices === 1 ? 'factura pendiente' : 'facturas pendientes'} por un total de{' '}
              <span className="font-semibold">${counts.unpaid_total.toLocaleString()}</span>.{' '}
              <Link href={`/portal/${token}/invoices`} className="font-medium underline" style={{ color: accentColor }}>
                Ver facturas
              </Link>
            </p>
          </div>
        )}

        {/* Recent Activity */}
        {activity.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: accentColor }} />
              Actividad reciente
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              {activity.slice(0, 8).map(a => {
                const labels: Record<string, string> = {
                  viewed_projects: 'Consulto proyectos',
                  viewed_reports: 'Consulto reportes',
                  viewed_invoices: 'Consulto facturas',
                  viewed_deliverables: 'Consulto entregables',
                  paid_invoice: 'Pago realizado',
                  approved_deliverable: 'Aprobo entregable',
                  requested_revision: 'Solicito revision',
                  added_comment: 'Agrego comentario',
                  submitted_brief: 'Envio brief',
                }
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                    <p className="text-sm text-slate-600 flex-1">{labels[a.action] || a.action}</p>
                    <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-xs text-slate-400 text-center">
            Portal de {agencyName} &middot; Acceso seguro
          </p>
        </div>
      </footer>
    </div>
  )
}

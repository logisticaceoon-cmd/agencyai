'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { Zap, FolderKanban, FileText, Receipt, Loader2 } from 'lucide-react'

interface PortalData {
  access_token: string
  permissions: { projects?: boolean; reports?: boolean; invoices?: boolean }
  clients: { id: string; name: string; company: string } | null
  workspaces: { id: string; name: string; logo_url: string | null } | null
}

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) setError(j.error)
        else setData(j.data)
      })
      .catch(() => setError('Error de conexion'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-900">Acceso no valido</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    </div>
  )

  const perms = data?.permissions || {}
  const agencyName = data?.workspaces?.name || 'Agencia'
  const clientName = data?.clients?.name || 'Cliente'

  const navItems = [
    { href: `/portal/${token}/projects`, label: 'Proyectos', icon: FolderKanban, enabled: perms.projects },
    { href: `/portal/${token}/reports`, label: 'Reportes', icon: FileText, enabled: perms.reports },
    { href: `/portal/${token}/invoices`, label: 'Facturas', icon: Receipt, enabled: perms.invoices },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{agencyName}</p>
              <p className="text-[10px] text-slate-400">Portal del cliente</p>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600">{clientName}</p>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bienvenido, {clientName}</h1>
        <p className="text-sm text-slate-500 mb-8">Accede a la informacion de tu cuenta con {agencyName}.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {navItems.filter(n => n.enabled).map(item => (
            <Link key={item.href} href={item.href} className="rounded-xl border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-md transition-all group">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <item.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{item.label}</h3>
              <p className="text-sm text-slate-500 mt-1">Ver tus {item.label.toLowerCase()}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

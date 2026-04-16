'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, Upload, Globe, DollarSign, Briefcase, AlertTriangle, Save, Trash2, Loader2, Check, X } from 'lucide-react'
import { useProfessionalType } from '@/hooks/useProfessionalType'
import { useWorkspace } from '@/hooks/useWorkspace'
import { PROFESSIONAL_TYPES } from '@/lib/professional-types'

export default function WorkspacePage() {
  const { workspace, loading: wsLoading, setWorkspace } = useWorkspace()
  const [nombre, setNombre] = useState('')
  const [sitioWeb, setSitioWeb] = useState('')
  const [moneda, setMoneda] = useState('ARS')
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires')
  const [tipoAgencia, setTipoAgencia] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const { config: proConfig, refresh: refreshPro } = useProfessionalType()
  const [showTypeModal, setShowTypeModal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load workspace data into form
  useEffect(() => {
    if (!workspace) return
    setNombre(workspace.name || '')
    setSitioWeb(workspace.website || '')
    setMoneda(workspace.currency || 'ARS')
    setTimezone(workspace.timezone || 'America/Argentina/Buenos_Aires')
    setTipoAgencia(workspace.agency_type || '')
    setLogoUrl(workspace.logo_url || null)
  }, [workspace])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!workspace) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/organizations/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nombre.trim(),
          website: sitioWeb.trim(),
          currency: moneda,
          timezone,
          agency_type: tipoAgencia,
        }),
      })
      if (res.ok) {
        const j = await res.json()
        if (j.data) setWorkspace(j.data)
        setSaveMsg({ type: 'ok', text: 'Cambios guardados correctamente' })
      } else {
        const err = await res.json()
        setSaveMsg({ type: 'err', text: err.error || 'Error al guardar' })
      }
    } catch {
      setSaveMsg({ type: 'err', text: 'Error de conexion' })
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(null), 4000)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !workspace) return

    if (file.size > 2 * 1024 * 1024) {
      setSaveMsg({ type: 'err', text: 'El archivo es muy grande (max 2MB)' })
      setTimeout(() => setSaveMsg(null), 4000)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        setSaveMsg({ type: 'err', text: 'Error al subir el logo' })
        setUploading(false)
        return
      }
      const { url } = await uploadRes.json()

      // Update workspace with logo URL
      const patchRes = await fetch(`/api/organizations/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: url }),
      })
      if (patchRes.ok) {
        const j = await patchRes.json()
        if (j.data) setWorkspace(j.data)
        setLogoUrl(url)
        setSaveMsg({ type: 'ok', text: 'Logo actualizado' })
      } else {
        setSaveMsg({ type: 'err', text: 'Error al guardar el logo' })
      }
    } catch {
      setSaveMsg({ type: 'err', text: 'Error al subir el logo' })
    }
    setUploading(false)
    setTimeout(() => setSaveMsg(null), 4000)
  }

  if (wsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuracion del Workspace</h1>
        <p className="text-sm text-slate-500 mt-1">Administra la informacion de tu agencia u organizacion</p>
      </div>

      {/* Save feedback */}
      {saveMsg && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
          saveMsg.type === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {saveMsg.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {saveMsg.text}
        </div>
      )}

      {/* Professional type card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: proConfig.color + '15' }}>
              {proConfig.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Tipo de negocio</p>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">{proConfig.name}</h3>
              <p className="text-xs text-slate-500 mt-1">Personaliza la terminologia, vocabulario del agente IA y categorias sugeridas.</p>
            </div>
          </div>
          <button onClick={() => setShowTypeModal(true)} className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 whitespace-nowrap">
            Cambiar tipo
          </button>
        </div>
      </div>

      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowTypeModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Cambiar tipo de negocio</h3>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
              <p className="text-xs text-amber-800">Cambiar el tipo actualizara las categorias sugeridas y el vocabulario. Tus datos existentes no se modificaran.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROFESSIONAL_TYPES.map((pt) => {
                const selected = proConfig.id === pt.id
                return (
                  <button
                    key={pt.id}
                    onClick={async () => {
                      await fetch('/api/workspace/professional-type', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ professional_type_id: pt.id }),
                      })
                      await refreshPro()
                      setShowTypeModal(false)
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${selected ? 'border-2 shadow-sm' : 'border border-slate-200 bg-white hover:border-slate-300'}`}
                    style={selected ? { borderColor: pt.color, backgroundColor: pt.color + '10' } : undefined}
                  >
                    <span className="text-3xl flex-shrink-0">{pt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{pt.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pt.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowTypeModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Informacion general</h2>
          </div>

          <div className="space-y-5">
            {/* Logo upload */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">Logo de la agencia</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  className="h-20 w-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                  ) : logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <Upload className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  <p className="text-xs text-slate-400 mt-1">PNG, SVG, JPG. Max 2MB.</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Agency name */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Nombre de la agencia</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Mi Agencia Digital"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Sitio web</label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                  https://
                </span>
                <input
                  type="text"
                  value={sitioWeb}
                  onChange={(e) => setSitioWeb(e.target.value)}
                  placeholder="miagencia.com"
                  className="flex-1 rounded-r-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Regional & Type */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Configuracion regional</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Moneda
                </span>
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="ARS">ARS - Peso Argentino</option>
                <option value="USD">USD - Dolar Estadounidense</option>
                <option value="EUR">EUR - Euro</option>
                <option value="BRL">BRL - Real Brasileno</option>
                <option value="CLP">CLP - Peso Chileno</option>
                <option value="COP">COP - Peso Colombiano</option>
                <option value="MXN">MXN - Peso Mexicano</option>
              </select>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">Zona horaria</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
                <option value="America/Sao_Paulo">Sao Paulo (GMT-3)</option>
                <option value="America/Santiago">Santiago (GMT-4)</option>
                <option value="America/Bogota">Bogota (GMT-5)</option>
                <option value="America/Mexico_City">Ciudad de Mexico (GMT-6)</option>
                <option value="America/New_York">Nueva York (GMT-5)</option>
                <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
                <option value="Europe/Madrid">Madrid (GMT+1)</option>
              </select>
            </div>

            {/* Agency type */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  Tipo de agencia
                </span>
              </label>
              <select
                value={tipoAgencia}
                onChange={(e) => setTipoAgencia(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="">Seleccionar tipo...</option>
                <option value="marketing_digital">Marketing Digital</option>
                <option value="diseno_creatividad">Diseno y Creatividad</option>
                <option value="desarrollo_web">Desarrollo Web/App</option>
                <option value="relaciones_publicas">Relaciones Publicas</option>
                <option value="consultoria">Consultoria</option>
                <option value="social_media">Social Media</option>
                <option value="produccion">Produccion Audiovisual</option>
                <option value="otra">Otra</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-xl border-2 border-red-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Zona de peligro</h2>
            <p className="text-xs text-slate-500">Acciones irreversibles sobre tu workspace</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Eliminar workspace</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Se eliminaran todos los datos, clientes, proyectos y tareas. Esta accion no se puede deshacer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Eliminar workspace?</h3>
                <p className="text-sm text-slate-500">Esta accion es permanente</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Todos los datos de tu workspace seran eliminados de forma permanente, incluyendo clientes, proyectos, tareas y archivos.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                Escribe <span className="font-bold text-red-600">ELIMINAR</span> para confirmar
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="ELIMINAR"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteDialog(false); setDeleteConfirm('') }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteConfirm !== 'ELIMINAR'}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Eliminar workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

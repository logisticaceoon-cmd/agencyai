'use client'

import { useState } from 'react'
import { Building2, Upload, Globe, DollarSign, Briefcase, AlertTriangle, Save, Trash2 } from 'lucide-react'

export default function WorkspacePage() {
  const [nombre, setNombre] = useState('')
  const [sitioWeb, setSitioWeb] = useState('')
  const [moneda, setMoneda] = useState('ARS')
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires')
  const [tipoAgencia, setTipoAgencia] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => setSaving(false), 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración del Workspace</h1>
        <p className="text-sm text-slate-500 mt-1">Administrá la información de tu agencia u organización</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Información general</h2>
          </div>

          <div className="space-y-5">
            {/* Logo upload */}
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">Logo de la agencia</label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Upload className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <button
                    type="button"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Subir logo
                  </button>
                  <p className="text-xs text-slate-400 mt-1">PNG, SVG. Recomendado 256x256px.</p>
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
            <h2 className="text-lg font-semibold text-slate-900">Configuración regional</h2>
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
                <option value="USD">USD - Dólar Estadounidense</option>
                <option value="EUR">EUR - Euro</option>
                <option value="BRL">BRL - Real Brasileño</option>
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
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="America/Santiago">Santiago (GMT-4)</option>
                <option value="America/Bogota">Bogotá (GMT-5)</option>
                <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                <option value="America/New_York">Nueva York (GMT-5)</option>
                <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
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
                <option value="diseno_creatividad">Diseño y Creatividad</option>
                <option value="desarrollo_web">Desarrollo Web/App</option>
                <option value="relaciones_publicas">Relaciones Públicas</option>
                <option value="consultoria">Consultoría</option>
                <option value="social_media">Social Media</option>
                <option value="produccion">Producción Audiovisual</option>
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
            <Save className="h-4 w-4" />
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
              Se eliminarán todos los datos, clientes, proyectos y tareas. Esta acción no se puede deshacer.
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
                <h3 className="text-lg font-semibold text-slate-900">¿Eliminar workspace?</h3>
                <p className="text-sm text-slate-500">Esta acción es permanente</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Todos los datos de tu workspace serán eliminados de forma permanente, incluyendo clientes, proyectos, tareas y archivos.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                Escribí <span className="font-bold text-red-600">ELIMINAR</span> para confirmar
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
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeleteConfirm('')
                }}
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

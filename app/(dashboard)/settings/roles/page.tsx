'use client'

import { useState, useEffect } from 'react'
import { Shield, Plus, X, Loader2, Check, Pencil, Trash2, Lock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface WorkspaceRole {
  id: string
  key: string
  label: string
  description: string | null
  color: string
  base_role: 'owner' | 'admin' | 'trafficker' | 'viewer'
  is_system: boolean
  is_active: boolean
}

const BASE_ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño (permisos totales)',
  admin: 'Admin (permisos operativos)',
  trafficker: 'Trafficker (solo asignados)',
  viewer: 'Solo lectura',
}

const BASE_ROLE_COLORS: Record<string, string> = {
  owner: 'text-amber-700 bg-amber-50 border-amber-200',
  admin: 'text-purple-700 bg-purple-50 border-purple-200',
  trafficker: 'text-blue-700 bg-blue-50 border-blue-200',
  viewer: 'text-slate-600 bg-slate-100 border-slate-200',
}

const PRESET_COLORS = [
  '#f59e0b', '#8b5cf6', '#3b82f6', '#64748b',
  '#10b981', '#ef4444', '#f97316', '#ec4899',
  '#06b6d4', '#84cc16', '#a855f7', '#0ea5e9',
]

const ROLE_EXAMPLES = [
  { label: 'Social Media Manager', base: 'trafficker', description: 'Gestiona redes y contenido' },
  { label: 'Director Creativo', base: 'admin', description: 'Aprueba creativos y estrategia' },
  { label: 'Analista de Datos', base: 'trafficker', description: 'Analiza métricas y reportes' },
  { label: 'Cliente Observer', base: 'viewer', description: 'Acceso de solo lectura para el cliente' },
  { label: 'Estratega de Contenido', base: 'trafficker', description: 'Define estrategia de contenido' },
  { label: 'Media Buyer', base: 'trafficker', description: 'Gestiona compra de medios y pauta' },
]

export default function RolesPage() {
  const { user } = useCurrentUser()
  const [roles, setRoles] = useState<WorkspaceRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState<WorkspaceRole | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteRole, setConfirmDeleteRole] = useState<WorkspaceRole | null>(null)

  // Form state
  const [formLabel, setFormLabel] = useState('')
  const [formKey, setFormKey] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formBase, setFormBase] = useState<'owner' | 'admin' | 'trafficker' | 'viewer'>('trafficker')
  const [formColor, setFormColor] = useState('#6366f1')
  const [formError, setFormError] = useState('')

  const isOwner = user?.role === 'owner'

  async function fetchRoles() {
    setLoading(true)
    const res = await fetch('/api/roles')
    if (res.ok) {
      const j = await res.json()
      setRoles(j.data || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchRoles() }, [])

  function openCreate() {
    setEditingRole(null)
    setFormLabel('')
    setFormKey('')
    setFormDesc('')
    setFormBase('trafficker')
    setFormColor('#6366f1')
    setFormError('')
    setShowForm(true)
  }

  function openEdit(role: WorkspaceRole) {
    setEditingRole(role)
    setFormLabel(role.label)
    setFormKey(role.key)
    setFormDesc(role.description || '')
    setFormBase(role.base_role)
    setFormColor(role.color)
    setFormError('')
    setShowForm(true)
  }

  function applyExample(ex: typeof ROLE_EXAMPLES[0]) {
    setFormLabel(ex.label)
    setFormKey(ex.label.toLowerCase().replace(/[^a-z0-9]/g, '_'))
    setFormDesc(ex.description)
    setFormBase(ex.base as 'owner' | 'admin' | 'trafficker' | 'viewer')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!formLabel.trim()) { setFormError('El nombre es obligatorio'); return }
    if (!editingRole && !formKey.trim()) { setFormError('El identificador es obligatorio'); return }

    setSaving(true)
    try {
      const body = {
        label: formLabel,
        key: formKey,
        description: formDesc,
        base_role: formBase,
        color: formColor,
      }

      const res = editingRole
        ? await fetch(`/api/roles/${editingRole.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Error al guardar')
        return
      }
      setShowForm(false)
      fetchRoles()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(role: WorkspaceRole) {
    setConfirmDeleteRole(role)
  }

  async function executeDeleteRole(role: WorkspaceRole) {
    setDeletingId(role.id)
    await fetch(`/api/roles/${role.id}`, { method: 'DELETE' })
    setDeletingId(null)
    fetchRoles()
  }

  const systemRoles = roles.filter(r => r.is_system)
  const customRoles = roles.filter(r => !r.is_system)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles del workspace</h1>
          <p className="text-sm text-slate-500 mt-1">
            Define qué puede hacer cada persona en tu agencia
          </p>
        </div>
        {isOwner && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nuevo rol
          </button>
        )}
      </div>

      {/* Info banner */}
      {!isOwner && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">Solo el dueño del workspace puede crear y modificar roles.</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingRole ? `Editar: ${editingRole.label}` : 'Crear nuevo rol'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-5">
            {/* Quick examples — only when creating */}
            {!editingRole && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Ejemplos rápidos</p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_EXAMPLES.map(ex => (
                    <button
                      key={ex.label}
                      type="button"
                      onClick={() => applyExample(ex)}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Nombre del rol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={e => {
                    setFormLabel(e.target.value)
                    if (!editingRole) setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'))
                  }}
                  placeholder="Ej: Media Buyer"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {!editingRole && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Identificador (ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formKey}
                    onChange={e => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    placeholder="media_buyer"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Solo letras, números y guiones bajos</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Descripción</label>
              <input
                type="text"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Qué hace este rol en la agencia"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Base role selector */}
            {!editingRole?.is_system && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Nivel de permisos <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Los permisos se heredan del nivel base — no tenés que configurarlos uno a uno.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['owner', 'admin', 'trafficker', 'viewer'] as const).map(base => (
                    <button
                      key={base}
                      type="button"
                      onClick={() => setFormBase(base)}
                      className={cn(
                        'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all',
                        formBase === base ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold mt-0.5 flex-shrink-0',
                        formBase === base ? 'border-blue-300 bg-blue-100 text-blue-700' : BASE_ROLE_COLORS[base]
                      )}>
                        {base}
                      </span>
                      <span className="text-xs text-slate-600">{BASE_ROLE_LABELS[base]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color picker */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Color del badge</label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormColor(c)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                      formColor === c ? 'border-slate-800 scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: formColor }}
                >
                  {formLabel || 'Vista previa'}
                </span>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? 'Guardando...' : editingRole ? 'Guardar cambios' : 'Crear rol'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* System roles */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Roles del sistema ({systemRoles.length})
              </h2>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
              {systemRoles.map(role => (
                <RoleRow
                  key={role.id}
                  role={role}
                  isOwner={isOwner}
                  deleting={deletingId === role.id}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>

          {/* Custom roles */}
          {customRoles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Roles personalizados ({customRoles.length})
                </h2>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                {customRoles.map(role => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    isOwner={isOwner}
                    deleting={deletingId === role.id}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {customRoles.length === 0 && isOwner && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Shield className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">No tenés roles personalizados aún</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Creá roles como "Media Buyer", "Estratega" o "Cliente Observer" para tu agencia
              </p>
              <button
                onClick={openCreate}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                + Crear primer rol personalizado
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirm delete role modal */}
      {confirmDeleteRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Confirmar eliminación</h3>
            <p className="text-gray-600 mb-4">¿Eliminar el rol &quot;{confirmDeleteRole.label}&quot;? Los miembros con este rol quedarán sin rol válido.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteRole(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={() => { executeDeleteRole(confirmDeleteRole); setConfirmDeleteRole(null) }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RoleRow({
  role, isOwner, deleting, onEdit, onDelete
}: {
  role: WorkspaceRole
  isOwner: boolean
  deleting: boolean
  onEdit: (r: WorkspaceRole) => void
  onDelete: (r: WorkspaceRole) => void
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
      {/* Color dot */}
      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900">{role.label}</span>
          {role.is_system && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
              <Lock className="h-2.5 w-2.5" /> Sistema
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-400">{role.key}</span>
        </div>
        {role.description && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{role.description}</p>
        )}
      </div>

      {/* Base role badge */}
      <span className={cn(
        'flex-shrink-0 text-[10px] font-semibold rounded-full border px-2.5 py-0.5',
        BASE_ROLE_COLORS[role.base_role]
      )}>
        {role.base_role}
      </span>

      {/* Actions */}
      {isOwner && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onEdit(role)}
            title="Editar"
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!role.is_system && (
            <button
              onClick={() => onDelete(role)}
              disabled={deleting}
              title="Eliminar"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

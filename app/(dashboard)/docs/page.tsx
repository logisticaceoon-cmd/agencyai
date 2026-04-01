'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn, formatDate } from '@/lib/utils'
import { BookmarkCard, getIconForUrl, getCategoryForUrl, getTitleForUrl, type Bookmark } from '@/components/bookmarks/BookmarkCard'
import {
  BookOpen, Plus, Search, X, Pin, Link2, Loader2,
  Upload, FileText, File, ExternalLink, FolderOpen,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

// ── Types ────────────────────────────────────────────────────────────────────

interface Client { id: string; name: string }
interface Project { id: string; name: string }

type PageTab = 'documentos' | 'marcadores'

const BOOKMARK_CATEGORIES = [
  { key: '', label: 'Todos' },
  { key: 'drive', label: 'Drive' },
  { key: 'sheets', label: 'Sheets' },
  { key: 'docs', label: 'Docs' },
  { key: 'notion', label: 'Notion' },
  { key: 'figma', label: 'Figma' },
  { key: 'externo', label: 'Externo' },
  { key: 'general', label: 'General' },
]

const ICON_OPTIONS = ['📄', '📊', '📈', '📝', '🔗', '📁', '🎨', '💡', '📋', '🗂️', '📌', '⭐', '🚀', '💰', '👥', '🎯']

const COLOR_OPTIONS = [
  { value: '#2563eb', label: 'Azul' },
  { value: '#16a34a', label: 'Verde' },
  { value: '#dc2626', label: 'Rojo' },
  { value: '#d97706', label: 'Amarillo' },
  { value: '#7c3aed', label: 'Purpura' },
  { value: '#ea580c', label: 'Naranja' },
  { value: '#db2777', label: 'Rosa' },
  { value: '#64748b', label: 'Gris' },
]

function isDocumentUrl(url: string): boolean {
  try {
    const u = url.toLowerCase()
    return u.includes('/uploads/') || u.includes('agency-files') || u.includes('supabase.co/storage')
  } catch { return false }
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(ext)) return '📕'
  if (['doc', 'docx'].includes(ext)) return '📘'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗'
  if (['ppt', 'pptx'].includes(ext)) return '📙'
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return '🖼️'
  if (['mp4', 'mov', 'avi'].includes(ext)) return '🎬'
  if (['zip', 'rar', '7z'].includes(ext)) return '📦'
  if (['fig'].includes(ext)) return '🎨'
  return '📄'
}

function getFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const { user } = useCurrentUser()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [activeTab, setActiveTab] = useState<PageTab>('documentos')

  // Modals
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Doc form
  const [docTitle, setDocTitle] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docDescription, setDocDescription] = useState('')
  const [docClientId, setDocClientId] = useState('')
  const [docProjectId, setDocProjectId] = useState('')
  const [docMode, setDocMode] = useState<'upload' | 'link'>('upload')
  const [uploadedFileUrl, setUploadedFileUrl] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')

  // Bookmark form
  const [formUrl, setFormUrl] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formIcon, setFormIcon] = useState('📄')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formClientId, setFormClientId] = useState('')
  const [formProjectId, setFormProjectId] = useState('')
  const [formColor, setFormColor] = useState('#2563eb')
  const [formPinned, setFormPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const loadBookmarks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bookmarks')
      if (res.ok) {
        const json = await res.json()
        setBookmarks(json.data || [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadBookmarks() }, [loadBookmarks])

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : d.data || [])),
      fetch('/api/projects?limit=100').then(r => r.json()).then(d => setProjects(d.data || [])),
    ]).catch(() => {})
  }, [])

  // Split bookmarks into documents (uploaded files + doc links) and marcadores (external links)
  const documents = useMemo(() => bookmarks.filter(b => b.category === 'archivo'), [bookmarks])
  const marcadores = useMemo(() => bookmarks.filter(b => b.category !== 'archivo'), [bookmarks])

  // Filtered items based on active tab
  const currentItems = activeTab === 'documentos' ? documents : marcadores
  const filtered = useMemo(() => {
    return currentItems.filter(b => {
      if (activeTab === 'marcadores' && categoryFilter && b.category !== categoryFilter) return false
      if (clientFilter && b.client_id !== clientFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [currentItems, categoryFilter, clientFilter, searchQuery, activeTab])

  const pinnedItems = filtered.filter(b => b.pinned)
  const unpinnedItems = filtered.filter(b => !b.pinned)

  // ── File Upload ──────────────────────────────────────────────────────────────

  async function handleFileUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Maximo 10MB.')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setUploadedFileUrl(data.url)
      setUploadedFileName(file.name)
      setDocTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
      setDocMode('upload')
      setDocModalOpen(true)
    } catch {
      alert('Error al subir el archivo. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = ''
  }

  // ── Save Document ────────────────────────────────────────────────────────────

  async function handleSaveDocument() {
    const url = docMode === 'upload' ? uploadedFileUrl : docUrl.trim()
    const title = docTitle.trim()
    if (!url || !title) return
    setSaving(true)
    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title,
          description: docDescription.trim() || null,
          icon: docMode === 'upload' ? getFileIcon(uploadedFileName || title) : getIconForUrl(url),
          category: 'archivo',
          client_id: docClientId || null,
          project_id: docProjectId || null,
          color: '#2563eb',
          pinned: false,
        }),
      })
      setDocModalOpen(false)
      resetDocForm()
      loadBookmarks()
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  function resetDocForm() {
    setDocTitle('')
    setDocUrl('')
    setDocDescription('')
    setDocClientId('')
    setDocProjectId('')
    setDocMode('upload')
    setUploadedFileUrl('')
    setUploadedFileName('')
  }

  function openDocModal() {
    resetDocForm()
    setDocModalOpen(true)
  }

  // ── Bookmark CRUD ────────────────────────────────────────────────────────────

  function handleUrlChange(url: string) {
    setFormUrl(url)
    if (!url) return
    setFormIcon(getIconForUrl(url))
    setFormCategory(getCategoryForUrl(url))
    const autoTitle = getTitleForUrl(url)
    if (autoTitle && !formTitle) setFormTitle(autoTitle)
  }

  function openBookmarkModal() {
    setEditingBookmark(null)
    setFormUrl(''); setFormTitle(''); setFormIcon('📄'); setFormDescription('')
    setFormCategory('general'); setFormClientId(''); setFormProjectId('')
    setFormColor('#2563eb'); setFormPinned(false)
    setBookmarkModalOpen(true)
  }

  function openEditBookmark(b: Bookmark) {
    setEditingBookmark(b)
    setFormUrl(b.url); setFormTitle(b.title); setFormIcon(b.icon)
    setFormDescription(b.description || ''); setFormCategory(b.category)
    setFormClientId(b.client_id || ''); setFormProjectId(b.project_id || '')
    setFormColor(b.color); setFormPinned(b.pinned)
    setBookmarkModalOpen(true)
  }

  async function handleSaveBookmark() {
    if (!formUrl.trim() || !formTitle.trim()) return
    setSaving(true)
    try {
      const payload = {
        url: formUrl.trim(), title: formTitle.trim(), icon: formIcon,
        description: formDescription.trim() || null, category: formCategory,
        client_id: formClientId || null, project_id: formProjectId || null,
        color: formColor, pinned: formPinned,
      }
      if (editingBookmark) {
        await fetch(`/api/bookmarks/${editingBookmark.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      setBookmarkModalOpen(false)
      loadBookmarks()
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este item?')) return
    await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, pinned } : b))
    await fetch(`/api/bookmarks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned }) })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen size={24} strokeWidth={1.5} className="text-[var(--blue)]" />
            Documentos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Archivos, links de documentos y marcadores rapidos</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'documentos' ? (
            <button onClick={openDocModal} className="btn-primary text-sm py-2 px-4">
              <Upload size={16} strokeWidth={1.5} /> Subir documento
            </button>
          ) : (
            <button onClick={openBookmarkModal} className="btn-primary text-sm py-2 px-4">
              <Plus size={16} strokeWidth={1.5} /> Nuevo marcador
            </button>
          )}
        </div>
      </div>

      {/* Main tabs: Documentos / Marcadores */}
      <div className="flex gap-1 border-b border-[var(--border-base)]">
        {([
          { key: 'documentos' as PageTab, label: 'Documentos', icon: FileText, count: documents.length },
          { key: 'marcadores' as PageTab, label: 'Marcadores', icon: ExternalLink, count: marcadores.length },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCategoryFilter('') }}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.key
                ? 'border-[var(--blue)] text-[var(--blue)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            <tab.icon size={16} strokeWidth={1.5} />
            {tab.label}
            <span className={cn(
              'text-xs rounded-full px-1.5 py-0.5 font-semibold',
              activeTab === tab.key ? 'bg-[var(--blue-light)] text-[var(--blue)]' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-9" />
        </div>
        <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="input w-auto min-w-[150px]">
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Category filter for marcadores */}
      {activeTab === 'marcadores' && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {BOOKMARK_CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setCategoryFilter(cat.key)}
              className={cn('px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                categoryFilter === cat.key ? 'bg-[var(--blue)] text-white' : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-slate-200'
              )}>
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ── DOCUMENTS TAB CONTENT ────────────────────────────────────── */}
      {activeTab === 'documentos' && (
        <>
          {/* Upload drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-[var(--radius-lg)] p-6 text-center cursor-pointer transition-all',
              dragOver ? 'border-[var(--blue)] bg-[var(--blue-light)]' : 'border-[var(--border-base)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]',
              uploading && 'pointer-events-none opacity-60'
            )}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.svg,.webp,.mp4,.mov,.zip,.rar,.fig" />
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin text-[var(--blue)]" />
                <span className="text-sm text-[var(--text-secondary)]">Subiendo archivo...</span>
              </div>
            ) : (
              <>
                <Upload size={28} strokeWidth={1.5} className="text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)] font-medium">Arrastra archivos aca o hace click para seleccionar</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">PDF, DOC, XLS, PPT, imagenes — Max 10MB</p>
              </>
            )}
          </div>

          {/* Or add by link */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border-base)]" />
            <button onClick={() => { resetDocForm(); setDocMode('link'); setDocModalOpen(true) }} className="text-xs font-medium text-[var(--blue)] hover:text-[#1d4ed8] transition-colors whitespace-nowrap">
              o agrega un link de documento
            </button>
            <div className="flex-1 h-px bg-[var(--border-base)]" />
          </div>
        </>
      )}

      {/* ── CONTENT GRID ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4 space-y-3">
              <div className="h-8 w-8 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 && !searchQuery && !categoryFilter ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">{activeTab === 'documentos' ? '📁' : '🔗'}</div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {activeTab === 'documentos' ? 'No hay documentos todavia' : 'No hay marcadores todavia'}
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mb-6">
            {activeTab === 'documentos'
              ? 'Subi archivos o agrega links a documentos de Drive, Sheets, Docs y mas'
              : 'Guarda links rapidos a sitios y herramientas que uses frecuentemente'}
          </p>
          <button onClick={activeTab === 'documentos' ? openDocModal : openBookmarkModal} className="btn-primary text-sm py-2.5 px-5">
            <Plus size={16} strokeWidth={1.5} />
            {activeTab === 'documentos' ? 'Agregar documento' : 'Agregar marcador'}
          </button>
        </div>
      ) : (
        <>
          {pinnedItems.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 mb-3">
                <Pin size={14} strokeWidth={1.5} /> Fijados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {pinnedItems.map(b => (
                  <BookmarkCard key={b.id} bookmark={b} onEdit={activeTab === 'marcadores' ? openEditBookmark : () => {}} onDelete={handleDelete} onTogglePin={handleTogglePin} />
                ))}
              </div>
            </div>
          )}

          {unpinnedItems.length > 0 && (
            <div>
              {pinnedItems.length > 0 && (
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                  {activeTab === 'documentos' ? 'Todos los documentos' : 'Todos los marcadores'}
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {unpinnedItems.map(b => (
                  <BookmarkCard key={b.id} bookmark={b} onEdit={activeTab === 'marcadores' ? openEditBookmark : () => {}} onDelete={handleDelete} onTogglePin={handleTogglePin} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (searchQuery || categoryFilter) && (
            <div className="text-center py-12">
              <Search size={24} strokeWidth={1.5} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No se encontraron resultados</p>
            </div>
          )}
        </>
      )}

      {/* ── DOCUMENT MODAL (upload or link) ──────────────────────────── */}
      <Dialog.Root open={docModalOpen} onOpenChange={setDocModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-[var(--radius-xl)] border border-[var(--border-base)] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-scale-in">
            <div className="flex items-center justify-between px-6 pt-6">
              <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                {docMode === 'upload' && uploadedFileUrl ? 'Detalles del archivo' : 'Agregar documento'}
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </Dialog.Close>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Mode toggle */}
              {!uploadedFileUrl && (
                <div className="flex rounded-lg border border-[var(--border-base)] p-0.5 bg-[var(--bg-subtle)]">
                  <button onClick={() => setDocMode('upload')} className={cn('flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors', docMode === 'upload' ? 'bg-white text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]')}>
                    <Upload size={14} strokeWidth={1.5} /> Subir archivo
                  </button>
                  <button onClick={() => setDocMode('link')} className={cn('flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors', docMode === 'link' ? 'bg-white text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]')}>
                    <Link2 size={14} strokeWidth={1.5} /> Link de documento
                  </button>
                </div>
              )}

              {/* Upload area or uploaded file info */}
              {docMode === 'upload' && !uploadedFileUrl && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border-base)] rounded-[var(--radius-md)] p-8 text-center cursor-pointer hover:border-[var(--blue)] hover:bg-[var(--blue-light)] transition-all"
                >
                  <Upload size={24} strokeWidth={1.5} className="text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">Click para seleccionar archivo</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Max 10MB</p>
                </div>
              )}

              {docMode === 'upload' && uploadedFileUrl && (
                <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--green-light)] border border-green-200 p-3">
                  <span className="text-xl">{getFileIcon(uploadedFileName)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{uploadedFileName}</p>
                    <p className="text-xs text-emerald-600">Archivo subido correctamente</p>
                  </div>
                </div>
              )}

              {/* Link input */}
              {docMode === 'link' && (
                <div>
                  <label className="label">URL del documento *</label>
                  <input type="url" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} className="input" placeholder="https://docs.google.com/..." />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="label">Titulo *</label>
                <input type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="input" placeholder="Nombre del documento" />
              </div>

              {/* Description */}
              <div>
                <label className="label">Descripcion</label>
                <textarea value={docDescription} onChange={(e) => setDocDescription(e.target.value)} className="input resize-y" rows={2} placeholder="Descripcion opcional..." />
              </div>

              {/* Client + Project */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cliente</label>
                  <select value={docClientId} onChange={(e) => setDocClientId(e.target.value)} className="input">
                    <option value="">Sin cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Proyecto</label>
                  <select value={docProjectId} onChange={(e) => setDocProjectId(e.target.value)} className="input">
                    <option value="">Sin proyecto</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-6">
              <Dialog.Close asChild>
                <button type="button" className="btn-secondary text-sm py-2 px-4">Cancelar</button>
              </Dialog.Close>
              <button
                onClick={handleSaveDocument}
                disabled={saving || !docTitle.trim() || (docMode === 'upload' ? !uploadedFileUrl : !docUrl.trim())}
                className="btn-primary text-sm py-2 px-4"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Guardar documento
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── BOOKMARK MODAL ───────────────────────────────────────────── */}
      <Dialog.Root open={bookmarkModalOpen} onOpenChange={setBookmarkModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-[var(--radius-xl)] border border-[var(--border-base)] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6">
              <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                {editingBookmark ? 'Editar marcador' : 'Nuevo marcador'}
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </Dialog.Close>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">URL *</label>
                <input type="url" value={formUrl} onChange={(e) => handleUrlChange(e.target.value)} className="input" placeholder="https://..." />
                {formUrl && <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1"><Link2 size={10} /> {(() => { try { return new URL(formUrl).hostname } catch { return '' } })()}</p>}
              </div>
              <div>
                <label className="label">Titulo *</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="input" placeholder="Nombre del marcador" />
              </div>
              <div>
                <label className="label">Icono</label>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_OPTIONS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setFormIcon(emoji)}
                      className={cn('h-8 w-8 rounded-lg flex items-center justify-center text-base transition-all', formIcon === emoji ? 'bg-[var(--blue-light)] ring-2 ring-[var(--blue)]' : 'bg-[var(--bg-muted)] hover:bg-slate-200')}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Descripcion</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="input resize-y" rows={2} placeholder="Para que sirve?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Categoria</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="input">
                    {BOOKMARK_CATEGORIES.filter(c => c.key).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Color</label>
                  <div className="flex gap-1.5 mt-1">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c.value} type="button" onClick={() => setFormColor(c.value)}
                        className={cn('h-6 w-6 rounded-full transition-all', formColor === c.value ? 'ring-2 ring-offset-1 ring-[var(--blue)]' : '')}
                        style={{ backgroundColor: c.value }} title={c.label} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cliente</label>
                  <select value={formClientId} onChange={(e) => setFormClientId(e.target.value)} className="input">
                    <option value="">Sin cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Proyecto</label>
                  <select value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)} className="input">
                    <option value="">Sin proyecto</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formPinned} onChange={(e) => setFormPinned(e.target.checked)} className="h-4 w-4 rounded border-[var(--border-base)] text-[var(--blue)] focus:ring-[var(--blue)]" />
                <span className="text-sm text-[var(--text-secondary)]">Fijar en la parte superior</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-6">
              <Dialog.Close asChild>
                <button type="button" className="btn-secondary text-sm py-2 px-4">Cancelar</button>
              </Dialog.Close>
              <button onClick={handleSaveBookmark} disabled={saving || !formUrl.trim() || !formTitle.trim()} className="btn-primary text-sm py-2 px-4">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editingBookmark ? 'Guardar cambios' : 'Guardar marcador'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

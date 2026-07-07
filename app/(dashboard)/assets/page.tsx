'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { cn, timeAgo } from '@/lib/utils'
import {
  ImageIcon,
  Plus,
  Search,
  FileText,
  Film,
  Palette,
  File,
  Upload,
  X,
  Trash2,
  ExternalLink,
  Grid3x3,
  List,
  Tag,
} from 'lucide-react'

interface Asset {
  id: string
  name: string
  file_url: string
  file_path: string | null
  file_type: string
  file_size: number
  category: string
  client_id: string | null
  project_id: string | null
  tags: string[]
  created_at: string
  clients: { id: string; name: string } | null
  projects: { id: string; name: string } | null
}

interface Client { id: string; name: string }

const categoryConfig: Record<string, { label: string; icon: typeof ImageIcon; color: string; bg: string }> = {
  image:    { label: 'Imagen',    icon: ImageIcon, color: 'text-blue-600',   bg: 'bg-blue-50' },
  video:    { label: 'Video',     icon: Film,      color: 'text-purple-600', bg: 'bg-purple-50' },
  document: { label: 'Documento', icon: FileText,   color: 'text-amber-600',  bg: 'bg-amber-50' },
  design:   { label: 'Diseno',    icon: Palette,    color: 'text-pink-600',   bg: 'bg-pink-50' },
  other:    { label: 'Otro',      icon: File,       color: 'text-slate-600',  bg: 'bg-slate-50' },
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function detectCategory(fileType: string): string {
  if (fileType.startsWith('image/')) return 'image'
  if (fileType.startsWith('video/')) return 'video'
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('sheet') || fileType.startsWith('text/')) return 'document'
  if (fileType.includes('figma') || fileType.includes('sketch') || fileType.includes('psd')) return 'design'
  return 'other'
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    client_id: '',
    project_id: '',
    tags: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      if (clientFilter) params.set('client_id', clientFilter)
      if (searchQuery) params.set('search', searchQuery)

      const [assetsRes, clientsRes] = await Promise.all([
        fetch(`/api/assets?${params}`),
        fetch('/api/clients?limit=200'),
      ])

      if (assetsRes.ok) {
        const data = await assetsRes.json()
        setAssets(data.data || [])
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.data || data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, clientFilter, searchQuery])

  useEffect(() => { loadData() }, [loadData])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        // 1. Upload file
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!uploadRes.ok) {
          toast({ title: `Error subiendo ${file.name}`, variant: 'destructive' })
          continue
        }
        const { url, path } = await uploadRes.json()

        // 2. Register asset
        const assetRes = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            file_url: url,
            file_path: path,
            file_type: file.type,
            file_size: file.size,
            category: detectCategory(file.type),
            client_id: uploadForm.client_id || null,
            project_id: uploadForm.project_id || null,
            tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          }),
        })

        if (assetRes.ok) {
          toast({ title: `${file.name} subido` })
        }
      }
      loadData()
      setShowUploadModal(false)
      setUploadForm({ client_id: '', project_id: '', tags: '' })
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este archivo?')) return
    const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Archivo eliminado' })
      loadData()
    }
  }

  const isImage = (type: string) => type.startsWith('image/')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Archivos y Creativos</h1>
          <p className="mt-1 text-sm text-slate-500">Biblioteca de archivos del workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={cn('p-2', viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600')}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={cn('p-2', viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600')}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            <Upload className="h-4 w-4" /> Subir archivos
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
          <option value="">Todas las categorias</option>
          {Object.entries(categoryConfig).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
        </select>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 animate-pulse">
              <div className="h-32 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-2/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageIcon className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">Sin archivos</p>
          <p className="text-xs text-slate-400 mt-1">Sube tu primer archivo para comenzar</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {assets.map(a => {
            const cc = categoryConfig[a.category] || categoryConfig.other
            const Icon = cc.icon
            return (
              <div key={a.id} className="group rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="relative h-32 bg-slate-50 flex items-center justify-center">
                  {isImage(a.file_type) ? (
                    <img src={a.file_url} alt={a.name} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className={cn('h-10 w-10', cc.color)} />
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="rounded bg-white/90 p-1 shadow-sm hover:bg-white">
                      <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                    </a>
                    <button onClick={() => handleDelete(a.id)} className="rounded bg-white/90 p-1 shadow-sm hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-900 truncate">{a.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold', cc.bg, cc.color)}>{cc.label}</span>
                    <span className="text-[10px] text-slate-400">{formatFileSize(a.file_size)}</span>
                  </div>
                  {a.clients && <p className="text-[10px] text-slate-400 mt-1 truncate">{a.clients.name}</p>}
                  {a.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {a.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          <Tag className="h-2.5 w-2.5" />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Archivo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Tamano</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Fecha</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map(a => {
                const cc = categoryConfig[a.category] || categoryConfig.other
                const Icon = cc.icon
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded', cc.bg)}>
                          <Icon className={cn('h-4 w-4', cc.color)} />
                        </div>
                        <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', cc.bg, cc.color)}>{cc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{a.clients?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatFileSize(a.file_size)}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{timeAgo(a.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button onClick={() => handleDelete(a.id)} className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Subir archivos</h2>
              <button onClick={() => setShowUploadModal(false)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Cliente (opcional)</label>
                <select value={uploadForm.client_id} onChange={e => setUploadForm(f => ({ ...f, client_id: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Tags (separados por coma)</label>
                <input type="text" value={uploadForm.tags} onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="logo, banner, social" />
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-1">Arrastra archivos o haz clic</p>
                <p className="text-xs text-slate-400">Max 10MB por archivo</p>
                <input type="file" multiple onChange={handleFileUpload} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" style={{ position: 'relative', marginTop: '8px' }} />
              </div>
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Subiendo...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

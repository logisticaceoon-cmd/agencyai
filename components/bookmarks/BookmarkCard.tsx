'use client'

import { useState } from 'react'
import { MoreVertical, Pin, PinOff, Pencil, Link2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Bookmark {
  id: string
  title: string
  url: string
  description: string | null
  icon: string
  color: string
  category: string
  pinned: boolean
  client_id: string | null
  project_id: string | null
  clients?: { id: string; name: string } | null
  projects?: { id: string; name: string } | null
  created_at: string
}

interface BookmarkCardProps {
  bookmark: Bookmark
  onEdit: (b: Bookmark) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string, pinned: boolean) => void
}

export function getIconForUrl(url: string): string {
  try {
    const u = url.toLowerCase()
    if (u.includes('docs.google.com/spreadsheets')) return '📊'
    if (u.includes('docs.google.com/document')) return '📝'
    if (u.includes('docs.google.com/presentation')) return '📽️'
    if (u.includes('docs.google.com')) return '📄'
    if (u.includes('drive.google.com')) return '📁'
    if (u.includes('notion.so') || u.includes('notion.site')) return '⬛'
    if (u.includes('figma.com')) return '🎨'
    if (u.includes('github.com')) return '🐙'
    if (u.includes('slack.com')) return '💬'
    if (u.includes('trello.com')) return '📋'
    if (u.includes('canva.com')) return '🖼️'
    if (u.includes('miro.com')) return '🟡'
    if (u.includes('youtube.com') || u.includes('youtu.be')) return '▶️'
    if (u.includes('linkedin.com')) return '💼'
    if (u.includes('instagram.com')) return '📸'
  } catch { /* ignore */ }
  return '🔗'
}

export function getCategoryForUrl(url: string): string {
  try {
    const u = url.toLowerCase()
    if (u.includes('docs.google.com/spreadsheets')) return 'sheets'
    if (u.includes('docs.google.com/document')) return 'docs'
    if (u.includes('docs.google.com')) return 'docs'
    if (u.includes('drive.google.com')) return 'drive'
    if (u.includes('notion.so') || u.includes('notion.site')) return 'notion'
    if (u.includes('figma.com')) return 'figma'
    if (u.includes('github.com')) return 'github'
  } catch { /* ignore */ }
  return 'externo'
}

export function getTitleForUrl(url: string): string {
  try {
    const u = url.toLowerCase()
    if (u.includes('docs.google.com/spreadsheets')) return 'Google Sheets'
    if (u.includes('docs.google.com/document')) return 'Google Docs'
    if (u.includes('docs.google.com/presentation')) return 'Google Slides'
    if (u.includes('drive.google.com')) return 'Google Drive'
    if (u.includes('notion.so') || u.includes('notion.site')) return 'Notion'
    if (u.includes('figma.com')) return 'Figma'
    if (u.includes('github.com')) return 'GitHub'
  } catch { /* ignore */ }
  return ''
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  drive: 'Drive', sheets: 'Sheets', docs: 'Docs', notion: 'Notion',
  figma: 'Figma', github: 'GitHub', slack: 'Slack', externo: 'Externo', general: 'General',
}

const CATEGORY_COLORS: Record<string, string> = {
  drive: 'bg-yellow-50 text-yellow-700',
  sheets: 'bg-emerald-50 text-emerald-700',
  docs: 'bg-blue-50 text-blue-700',
  notion: 'bg-slate-100 text-slate-700',
  figma: 'bg-purple-50 text-purple-700',
  github: 'bg-slate-100 text-slate-700',
  externo: 'bg-orange-50 text-orange-700',
  general: 'bg-slate-100 text-slate-500',
}

export function BookmarkCard({ bookmark, onEdit, onDelete, onTogglePin }: BookmarkCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  function handleCopyLink() {
    navigator.clipboard.writeText(bookmark.url)
    setMenuOpen(false)
  }

  return (
    <div
      onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
      className={cn(
        'rounded-[var(--radius-lg)] border bg-white p-4 cursor-pointer transition-all duration-200 group relative',
        'hover:border-blue-200 hover:shadow-[0_2px_8px_rgba(37,99,235,0.1)]',
        bookmark.pinned ? 'border-l-[3px] border-l-[var(--blue)] border-[var(--border-base)]' : 'border-[var(--border-base)]'
      )}
    >
      {/* Header: icon + actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center text-lg" style={{ backgroundColor: `${bookmark.color}15` }}>
          {bookmark.icon}
        </div>
        <div className="flex items-center gap-1">
          {bookmark.pinned && <Pin size={12} className="text-[var(--blue)]" />}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1 rounded text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-all"
            >
              <MoreVertical size={14} strokeWidth={1.5} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
                <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white shadow-lg py-1 text-sm animate-scale-in">
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePin(bookmark.id, !bookmark.pinned); setMenuOpen(false) }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    {bookmark.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                    {bookmark.pinned ? 'Desfijar' : 'Fijar'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(bookmark); setMenuOpen(false) }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyLink() }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Link2 size={13} /> Copiar link
                  </button>
                  <div className="border-t border-[var(--bg-muted)] my-1" />
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(bookmark.id); setMenuOpen(false) }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[var(--red)] hover:bg-[var(--red-light)] transition-colors"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5 line-clamp-1 group-hover:text-[var(--blue)] transition-colors">
        {bookmark.title}
      </h3>

      {/* Domain */}
      <p className="text-[11px] text-[var(--text-muted)] mb-2">{getDomain(bookmark.url)}</p>

      {/* Description */}
      {bookmark.description && (
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">{bookmark.description}</p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', CATEGORY_COLORS[bookmark.category] || CATEGORY_COLORS.general)}>
          {CATEGORY_LABELS[bookmark.category] || bookmark.category}
        </span>
        {bookmark.clients && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-muted)] text-[var(--text-secondary)]">
            {bookmark.clients.name}
          </span>
        )}
      </div>
    </div>
  )
}

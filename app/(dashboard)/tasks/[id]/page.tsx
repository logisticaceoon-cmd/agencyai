'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Avatar } from '@/components/shared/Avatar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DeadlineCountdown } from '@/components/shared/DeadlineCountdown'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { toast } from '@/hooks/use-toast'
import { formatDateTime, timeAgo } from '@/lib/utils'
import { ArrowLeft, Clock, User, Link as LinkIcon, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface TaskDetail {
  id: string
  title: string
  description: string | null
  assignedTo: string[]
  deadline: string | null
  status: string
  priority: string
  progressPercent: number
  sopLink: string | null
  estimatedHours: number | null
  actualHours: number | null
  validationNotes: string | null
  createdAt: string
  createdBy: { id: string; fullName: string; avatarUrl: string | null }
  client: { id: string; name: string } | null
  validatedBy: { id: string; fullName: string } | null
  validatedAt: string | null
  comments: Array<{
    id: string; text: string; createdAt: string
    author: { id: string; fullName: string; avatarUrl: string | null }
  }>
  activityLog: Array<{
    id: string; actionType: string; description: string | null; createdAt: string
    user: { id: string; fullName: string }
  }>
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useCurrentUser()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationNotes, setValidationNotes] = useState('')
  const [showValidationForm, setShowValidationForm] = useState(false)

  async function loadTask() {
    try {
      const res = await fetch(`/api/tasks/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setTask(data.data)
      } else {
        router.push('/tasks')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTask() }, [params.id])

  async function submitComment() {
    if (!comment.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/tasks/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: comment }),
      })
      if (res.ok) {
        setComment('')
        loadTask()
      }
    } finally {
      setSubmittingComment(false)
    }
  }

  async function validateTask(action: 'validated' | 'rejected' | 'review') {
    setValidating(true)
    try {
      const res = await fetch(`/api/tasks/${params.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, validationNotes }),
      })
      if (res.ok) {
        toast({ title: action === 'validated' ? 'Tarea validada ✅' : action === 'rejected' ? 'Tarea rechazada' : 'Enviada a revisión' })
        setShowValidationForm(false)
        setValidationNotes('')
        loadTask()
      }
    } finally {
      setValidating(false)
    }
  }

  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'
  const isAssigned = user && task?.assignedTo.includes(user.id)

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
  if (!task) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tasks" className="text-[var(--text-muted)] hover:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
          <StatusBadge status={task.status} />
          <StatusBadge status={task.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wider">Descripción</h2>
            <p className="text-slate-700 whitespace-pre-wrap">{task.description || 'Sin descripción'}</p>
          </div>

          {/* Progress */}
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <div className="flex justify-between mb-2">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Progreso</h2>
              <span className="text-sm font-bold text-slate-900">{task.progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${task.progressPercent}%` }}
              />
            </div>
          </div>

          {/* CEO Validation */}
          {isCEO && task.status !== 'rejected' && task.status !== 'completed' && (
            <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wider">Validación</h2>
              {!showValidationForm ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowValidationForm(true) }}
                    className="flex items-center gap-2 rounded-lg bg-green-600/10 border border-green-500/30 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-600/20 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" /> Validar
                  </button>
                  <button
                    onClick={() => validateTask('review')}
                    disabled={validating}
                    className="flex items-center gap-2 rounded-lg bg-yellow-600/10 border border-yellow-500/30 px-4 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-600/20 transition-colors"
                  >
                    <AlertCircle className="h-4 w-4" /> Revisar
                  </button>
                  <button
                    onClick={() => { setShowValidationForm(true) }}
                    className="flex items-center gap-2 rounded-lg bg-red-600/10 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600/20 transition-colors"
                  >
                    <XCircle className="h-4 w-4" /> Rechazar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={validationNotes}
                    onChange={(e) => setValidationNotes(e.target.value)}
                    placeholder="Notas de validación (opcional)..."
                    className="w-full rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2.5 text-slate-900 placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => validateTask('validated')}
                      disabled={validating}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" /> Validar
                    </button>
                    <button
                      onClick={() => validateTask('rejected')}
                      disabled={validating}
                      className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="h-4 w-4" /> Rechazar
                    </button>
                    <button
                      onClick={() => setShowValidationForm(false)}
                      className="rounded-lg border border-[var(--border-base)] px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation result */}
          {task.validatedBy && (
            <div className={`rounded-xl border p-4 ${
              task.status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
            }`}>
              <p className="text-sm font-medium text-slate-700">
                {task.status === 'completed' ? '✅ Validado' : '❌ Rechazado'} por {task.validatedBy?.fullName || 'Usuario'}
                {task.validatedAt && ` el ${formatDateTime(task.validatedAt)}`}
              </p>
              {task.validationNotes && (
                <p className="text-sm text-[var(--text-muted)] mt-1">{task.validationNotes}</p>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-4 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentarios ({task.comments.length})
            </h2>
            <div className="space-y-3 mb-4">
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author?.fullName || 'Usuario'} avatarUrl={c.author?.avatarUrl} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{c.author?.fullName || 'Usuario'}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                placeholder="Escribí un comentario..."
                className="flex-1 rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2 text-sm text-slate-900 placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={submitComment}
                disabled={submittingComment || !comment.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5 space-y-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Creado por</p>
              <div className="flex items-center gap-2">
                <Avatar name={task.createdBy?.fullName || 'Usuario'} avatarUrl={task.createdBy?.avatarUrl} size="sm" />
                <span className="text-sm text-slate-900">{task.createdBy?.fullName || 'Usuario'}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Deadline</p>
              <DeadlineCountdown deadline={task.deadline} />
              {task.deadline && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatDateTime(task.deadline)}</p>
              )}
            </div>
            {task.estimatedHours && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Tiempo estimado</p>
                <p className="text-sm text-slate-900">{task.estimatedHours}h</p>
              </div>
            )}
            {task.client && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Cliente</p>
                <Link href={`/clients/${task.client.id}`} className="text-sm text-indigo-400 hover:text-indigo-300">
                  {task.client.name}
                </Link>
              </div>
            )}
            {task.sopLink && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">SOP</p>
                <a
                  href={task.sopLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  <LinkIcon className="h-3 w-3" />
                  Ver SOP
                </a>
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Creada</p>
              <p className="text-sm text-[var(--text-muted)]">{formatDateTime(task.createdAt)}</p>
            </div>
          </div>

          {/* Activity Log */}
          {task.activityLog.length > 0 && (
            <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Actividad</h3>
              <div className="space-y-2">
                {task.activityLog.slice(0, 8).map((log) => (
                  <div key={log.id} className="text-xs text-[var(--text-muted)]">
                    <span className="text-slate-700">{log.user?.fullName || 'Usuario'}</span>{' '}
                    {log.description || log.actionType}{' '}
                    <span className="text-[var(--text-secondary)]">· {timeAgo(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'

export interface Phase {
  id: string
  title: string
  description: string | null
  deadline: string | null
  responsible_id: string | null
  status: 'pending' | 'in_progress' | 'completed'
  order: number
  created_at: string
  updated_at: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId } = await params

    // Verify project exists and belongs to workspace
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('phases')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const phases = (project.phases as Phase[]) || []
    // Sort by order
    phases.sort((a, b) => (a.order || 0) - (b.order || 0))

    return NextResponse.json({ data: phases })
  } catch (err) {
    console.error('Error in GET /api/projects/[id]/phases:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId } = await params

    const body = await request.json()

    if (!body.title) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 })
    }

    // Get current project with phases
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('phases')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const phases = (project.phases as Phase[]) || []
    const newPhase: Phase = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description || null,
      deadline: body.deadline || null,
      responsible_id: body.responsible_id || null,
      status: body.status || 'pending',
      order: phases.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const updatedPhases = [...phases, newPhase]

    // Update project with new phases
    const { data: updated, error: updateError } = await supabase
      .from('projects')
      .update({ phases: updatedPhases, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating project phases:', updateError)
      return NextResponse.json({ error: 'Error al crear la fase' }, { status: 500 })
    }

    // Create notification if deadline is within 3 days
    if (newPhase.deadline) {
      const deadlineDate = new Date(newPhase.deadline)
      const now = new Date()
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
        await supabase.from('notifications').insert({
          workspace_id: workspaceId,
          title: `Fase próxima a vencer: ${newPhase.title}`,
          message: `La fase "${newPhase.title}" vence en ${daysUntilDeadline} días`,
          type: 'warning',
          read: false,
          created_at: new Date().toISOString(),
        }).catch(err => console.error('Error creating notification:', err))
      }
    }

    return NextResponse.json({ data: newPhase }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/projects/[id]/phases:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

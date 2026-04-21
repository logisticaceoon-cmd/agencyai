import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import type { Phase } from '../route'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId, phaseId } = await params

    // Get project phases
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
    const phase = phases.find(p => p.id === phaseId)

    if (!phase) {
      return NextResponse.json({ error: 'Fase no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data: phase })
  } catch (err) {
    console.error('Error in GET /api/projects/[id]/phases/[phaseId]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId, phaseId } = await params

    const body = await request.json()

    // Get project phases
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
    const phaseIndex = phases.findIndex(p => p.id === phaseId)

    if (phaseIndex === -1) {
      return NextResponse.json({ error: 'Fase no encontrada' }, { status: 404 })
    }

    // Update phase
    const updatedPhase: Phase = {
      ...phases[phaseIndex],
      title: body.title ?? phases[phaseIndex].title,
      description: body.description ?? phases[phaseIndex].description,
      deadline: body.deadline ?? phases[phaseIndex].deadline,
      responsible_id: body.responsible_id ?? phases[phaseIndex].responsible_id,
      status: body.status ?? phases[phaseIndex].status,
      order: body.order ?? phases[phaseIndex].order,
      updated_at: new Date().toISOString(),
    }

    const updatedPhases = [...phases]
    updatedPhases[phaseIndex] = updatedPhase

    // Update project
    const { data: updated, error: updateError } = await supabase
      .from('projects')
      .update({ phases: updatedPhases, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating phase:', updateError)
      return NextResponse.json({ error: 'Error al actualizar la fase' }, { status: 500 })
    }

    // Create notification if deadline changed and is within 3 days
    if (body.deadline && updatedPhase.status !== 'completed') {
      const deadlineDate = new Date(body.deadline)
      const now = new Date()
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
        const { error: notifError } = await supabase.from('notifications').insert({
          workspace_id: workspaceId,
          title: `Fase próxima a vencer: ${updatedPhase.title}`,
          message: `La fase "${updatedPhase.title}" vence en ${daysUntilDeadline} días`,
          type: 'warning',
          read: false,
          created_at: new Date().toISOString(),
        })
        if (notifError) console.error('Error creating notification:', notifError)
      }
    }

    return NextResponse.json({ data: updatedPhase })
  } catch (err) {
    console.error('Error in PATCH /api/projects/[id]/phases/[phaseId]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId, phaseId } = await params

    // Get project phases
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
    const phaseIndex = phases.findIndex(p => p.id === phaseId)

    if (phaseIndex === -1) {
      return NextResponse.json({ error: 'Fase no encontrada' }, { status: 404 })
    }

    // Remove phase and reorder
    const updatedPhases = phases
      .filter((_, i) => i !== phaseIndex)
      .map((p, i) => ({ ...p, order: i }))

    // Update project
    const { error: updateError } = await supabase
      .from('projects')
      .update({ phases: updatedPhases, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error deleting phase:', updateError)
      return NextResponse.json({ error: 'Error al eliminar la fase' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/projects/[id]/phases/[phaseId]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
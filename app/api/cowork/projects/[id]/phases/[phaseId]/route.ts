import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'
import type { Phase } from '@/app/api/projects/[id]/phases/route'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId: workspaceId } = auth
    const { id: projectId, phaseId } = await params

    // Get project phases
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('phases')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const phases = (project.phases as Phase[]) || []
    const phase = phases.find(p => p.id === phaseId)

    if (!phase) {
      return NextResponse.json(
        { success: false, error: 'Phase not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { phase },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork phase GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId: workspaceId } = auth
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
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const phases = (project.phases as Phase[]) || []
    const phaseIndex = phases.findIndex(p => p.id === phaseId)

    if (phaseIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Phase not found' },
        { status: 404 }
      )
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
    const { error: updateError } = await supabase
      .from('projects')
      .update({ phases: updatedPhases, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating phase:', updateError)
      return NextResponse.json(
        { success: false, error: `Error updating phase: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Create notification if deadline changed and is within 3 days
    if (body.deadline && updatedPhase.status !== 'completed') {
      const deadlineDate = new Date(body.deadline)
      const now = new Date()
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
        const { error: notifError } = await supabase.from('notifications').insert({
          workspace_id: workspaceId,
          title: `Phase approaching deadline: ${updatedPhase.title}`,
          message: `Phase "${updatedPhase.title}" expires in ${daysUntilDeadline} days`,
          type: 'warning',
          read: false,
          created_at: new Date().toISOString(),
        })
        if (notifError) console.error('Error creating notification:', notifError)
      }
    }

    return NextResponse.json({
      success: true,
      data: { phase: updatedPhase },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork phase PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId: workspaceId } = auth
    const { id: projectId, phaseId } = await params

    // Get project phases
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('phases')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const phases = (project.phases as Phase[]) || []
    const phaseIndex = phases.findIndex(p => p.id === phaseId)

    if (phaseIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Phase not found' },
        { status: 404 }
      )
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
      return NextResponse.json(
        { success: false, error: `Error deleting phase: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Phase deleted successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork phase DELETE error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
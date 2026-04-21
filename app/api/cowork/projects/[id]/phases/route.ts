import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'
import type { Phase } from '@/app/api/projects/[id]/phases/route'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId } = await params

    // Get project with phases
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('phases')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({
        success: false,
        error: 'Proyecto no encontrado',
      }, { status: 404 })
    }

    const phases = ((project.phases as Phase[]) || []).sort((a, b) => (a.order || 0) - (b.order || 0))

    return NextResponse.json({
      success: true,
      data: { phases, total: phases.length },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork phases GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId } = await params

    const body = await request.json()

    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    // Get current project with phases
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

    // Update project
    const { error: updateError } = await supabase
      .from('projects')
      .update({ phases: updatedPhases, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error creating phase:', updateError)
      return NextResponse.json(
        { success: false, error: `Error creating phase: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Create notification if deadline is within 3 days
    if (newPhase.deadline) {
      const deadlineDate = new Date(newPhase.deadline)
      const now = new Date()
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
        await supabase.from('notifications').insert({
          workspace_id: workspaceId,
          title: `Phase approaching deadline: ${newPhase.title}`,
          message: `Phase "${newPhase.title}" expires in ${daysUntilDeadline} days`,
          type: 'warning',
          read: false,
          created_at: new Date().toISOString(),
        }).catch(err => console.error('Error creating notification:', err))
      }
    }

    return NextResponse.json({
      success: true,
      data: { phase: newPhase, message: 'Phase created successfully' },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (err) {
    console.error('Cowork phases POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

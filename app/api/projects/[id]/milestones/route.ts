import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id: projectId } = await params

    const { data, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching milestones:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in GET /api/projects/[id]/milestones:', err)
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

    const { data, error } = await supabase
      .from('project_milestones')
      .insert({
        project_id: projectId,
        workspace_id: workspaceId,
        title: body.title,
        description: body.description || null,
        due_date: body.due_date || null,
        completed: false,
        position: body.position ?? 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating milestone:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/projects/[id]/milestones:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

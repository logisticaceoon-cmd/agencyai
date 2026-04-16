import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { task: data },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork task GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.status !== undefined) updates.status = body.status
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.deadline !== undefined) updates.deadline = body.deadline

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Cowork task PATCH error:', error)
      return NextResponse.json({ error: `Error updating task: ${error.message}` }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { task: data, message: 'Task updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork task PATCH error:', err)
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
    const { supabase, organizationId } = auth
    const { id } = await params

    const body = await request.json()

    if (body.action !== 'complete') {
      return NextResponse.json({ error: 'Invalid action. Supported: "complete"' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Cowork task complete error:', error)
      return NextResponse.json({ error: `Error completing task: ${error.message}` }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { task: data, message: 'Task marked as completed' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork task complete error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

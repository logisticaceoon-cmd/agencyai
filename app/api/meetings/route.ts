import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    let query = supabase
      .from('meetings')
      .select('*, clients(id, name)')
      .eq('workspace_id', workspaceId)
      .order('date', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) {
      // Fallback without join
      const { data: fallback } = await supabase
        .from('meetings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('date', { ascending: false })

      const mapped = (fallback || []).map((m: Record<string, unknown>) => ({
        ...m,
        client: null,
        createdBy: null,
      }))
      return NextResponse.json({ data: mapped })
    }

    const mapped = (data || []).map((m: Record<string, unknown>) => {
      const client = m.clients as { id: string; name: string } | null
      return {
        ...m,
        client: client || null,
        clients: undefined,
        createdBy: null,
      }
    })

    return NextResponse.json({ data: mapped })
  } catch (err) {
    console.error('Error fetching meetings:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()

    const { data, error } = await supabase
      .from('meetings')
      .insert({
        workspace_id: workspaceId,
        title: body.title,
        client_id: body.clientId || null,
        date: body.date,
        attendees: body.attendees || [],
        summary: body.summary || null,
        decisions: body.decisions || null,
        agreed_tasks: body.agreedTasks || [],
        next_meeting_date: body.nextMeetingDate || null,
        notes: body.notes || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating meeting:', error)
      return NextResponse.json({ error: 'Error en la solicitud' }, { status: 400 })
    }

    // A2 FIX: Batch insert tasks instead of N+1 loop
    if (body.agreedTasks && body.agreedTasks.length > 0) {
      const tasksToInsert = body.agreedTasks
        .filter((t: { title?: string }) => t.title)
        .map((t: { title: string; assignedTo?: string; deadline?: string }) => ({
          workspace_id: workspaceId,
          title: t.title,
          description: `Tarea creada desde minuta: ${body.title}`,
          created_by: userId,
          assignee_id: t.assignedTo || userId,
          due_date: t.deadline || null,
          client_id: body.clientId || null,
          task_type: 'reunion',
          priority: 'medium',
          status: 'pending',
        }))
      if (tasksToInsert.length > 0) {
        await supabase.from('tasks').insert(tasksToInsert)
      }
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error creating meeting:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

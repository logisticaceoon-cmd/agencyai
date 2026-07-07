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
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { report: data },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork report GET error:', err)
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
    if (body.type !== undefined) updates.reportType = body.type
    if (body.reportType !== undefined) updates.reportType = body.reportType
    if (body.client_id !== undefined) updates.clientId = body.client_id
    if (body.task_id !== undefined) updates.taskId = body.task_id
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.file_urls !== undefined) updates.fileUrls = body.file_urls
    if (body.investment !== undefined) updates.investment = body.investment
    if (body.sales !== undefined) updates.sales = body.sales
    if (body.roas !== undefined) updates.roas = body.roas
    if (body.growth_pct !== undefined) updates.growthPct = body.growth_pct
    if (body.tasks_completed !== undefined) updates.tasksCompleted = body.tasks_completed
    if (body.tasks_pending !== undefined) updates.tasksPending = body.tasks_pending
    if (body.next_month_plan !== undefined) updates.nextMonthPlan = body.next_month_plan
    if (body.sent_to_client !== undefined) updates.sentToClient = body.sent_to_client
    if (body.validation_comments !== undefined) updates.validationComments = body.validation_comments

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.updatedAt = new Date().toISOString()

    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Cowork report PATCH error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { report: data, message: 'Report updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork report PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth
    const { id } = await params

    const { data, error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)
      .eq('workspace_id', organizationId)
      .select('id, title')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { message: `Report "${data.title}" deleted`, id: data.id },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork report DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')
    const reportType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('reports')
      .select('id, title, description, reportType, status, priority, clientId, taskId, submittedById, submittedAt, validatedById, validatedAt, validationComments, investment, sales, roas, growthPct, tasksCompleted, tasksPending, nextMonthPlan, sentToClient, tags, fileUrls, createdAt, updatedAt')
      .eq('workspace_id', organizationId)
      .order('createdAt', { ascending: false })
      .limit(limit)

    if (clientId) query = query.eq('clientId', clientId)
    if (status) query = query.eq('status', status)
    if (reportType) query = query.eq('reportType', reportType)

    const { data, error } = await query

    if (error) {
      console.error('Cowork reports GET error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { reports: data || [], total: data?.length || 0 },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Cowork reports GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth
    const { supabase, organizationId } = auth

    const body = await request.json()

    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'title and description are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        workspace_id: organizationId,
        title: body.title,
        description: body.description,
        reportType: body.type || body.reportType || 'monthly',
        clientId: body.client_id || null,
        taskId: body.task_id || null,
        submittedById: body.submitted_by || 'cowork-api',
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        tags: body.tags || [],
        fileUrls: body.file_urls || [],
        investment: body.investment || null,
        sales: body.sales || null,
        roas: body.roas || null,
        growthPct: body.growth_pct || null,
        tasksCompleted: body.tasks_completed || null,
        tasksPending: body.tasks_pending || null,
        nextMonthPlan: body.next_month_plan || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Cowork reports POST error:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { report: data, message: 'Report created successfully' },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (err) {
    console.error('Cowork reports POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

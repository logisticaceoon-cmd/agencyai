import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

const createReportSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  clientId: z.string().optional().nullable(),
  reportType: z.enum(['monthly', 'weekly', 'quarterly', 'custom']).optional(),
  description: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')

    let query = supabase
      .from('reports')
      .select('*')
      .eq('workspace_id', workspaceId)
      .limit(200)
      .order('createdAt', { ascending: false })

    if (status) query = query.eq('status', status)
    if (clientId) query = query.eq('clientId', clientId)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('Error in GET /api/reports:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const result = createReportSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const parsed = result.data

    const { data, error } = await supabase
      .from('reports')
      .insert({
        workspace_id: workspaceId,
        clientId: parsed.clientId || null,
        title: parsed.title,
        reportType: parsed.reportType || 'monthly',
        description: parsed.description || null,
        status: 'draft',
        submittedById: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating report:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/reports:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

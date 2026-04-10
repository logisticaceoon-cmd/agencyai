import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId, role } = auth

    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const action = body.action as string
    const validationNotes = body.validationNotes as string | undefined

    const statusMap: Record<string, string> = {
      validated: 'completed',
      rejected: 'rejected',
      review: 'in_progress',
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: statusMap[action] || 'in_progress',
        validated_by: userId,
        validated_at: new Date().toISOString(),
        validation_notes: validationNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

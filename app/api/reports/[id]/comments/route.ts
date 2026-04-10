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
    const { supabase, userId, fullName } = auth

    const { text } = await request.json()
    if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 })

    const { data, error } = await supabase
      .from('comments')
      .insert({
        text,
        author_id: userId,
        author_name: fullName,
        report_id: id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase } = auth
    const { milestoneId } = await params

    const { data, error } = await supabase
      .from('milestone_observations')
      .select('*')
      .eq('milestone_id', milestoneId)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error fetching observations:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in GET observations:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, userId } = auth
    const { milestoneId } = await params

    const body = await request.json()

    const { data, error } = await supabase
      .from('milestone_observations')
      .insert({
        milestone_id: milestoneId,
        content: body.content,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating observation:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Error in POST observations:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

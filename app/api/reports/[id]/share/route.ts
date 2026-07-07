import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import crypto from 'crypto'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    // Verificar que el reporte existe
    const { data: report, error } = await supabase
      .from('reports')
      .select('id, share_token')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    // Si ya tiene token, retornarlo
    if (report.share_token) {
      return NextResponse.json({ token: report.share_token })
    }

    // Generar nuevo token
    const token = crypto.randomBytes(32).toString('hex')

    const { error: updateError } = await supabase
      .from('reports')
      .update({ share_token: token })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (updateError) {
      console.error('Error generating share token:', updateError)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ token })
  } catch (err) {
    console.error('Share POST error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth
    const { id } = await params

    const { error } = await supabase
      .from('reports')
      .update({ share_token: null })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('Error removing share token:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Share DELETE error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

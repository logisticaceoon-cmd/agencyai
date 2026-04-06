import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const clientId = formData.get('client_id') as string | null

    if (!file || !clientId) {
      return NextResponse.json({ error: 'Falta archivo o client_id' }, { status: 400 })
    }

    // Verify client belongs to workspace
    const { data: client, error: clientError } = await supabase
      .from('finance_clients')
      .select('id')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Try to create bucket (ignore errors)
    try {
      await supabase.storage.createBucket('contracts', { public: true })
    } catch {
      // ignore
    }

    const path = `${workspaceId}/clients/${clientId}/${file.name}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(path, arrayBuffer, {
        upsert: true,
        contentType: file.type || 'application/octet-stream',
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from('contracts').getPublicUrl(path)
    const url = publicData.publicUrl

    const { error: updateError } = await supabase
      .from('finance_clients')
      .update({
        contract_pdf_url: url,
        contract_pdf_name: file.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ url, name: file.name })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}

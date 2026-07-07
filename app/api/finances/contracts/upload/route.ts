import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File
    const contractId = formData.get('contract_id') as string

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    if (!contractId) {
      return NextResponse.json({ error: 'contract_id requerido' }, { status: 400 })
    }

    // Verify contract belongs to this workspace
    const { data: contract, error: contractError } = await supabase
      .from('trafficker_contracts')
      .select('id')
      .eq('id', contractId)
      .eq('workspace_id', workspaceId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    // Ensure bucket exists
    try {
      await supabase.storage.createBucket('contracts', { public: false })
    } catch {
      // Bucket may already exist, ignore error
    }

    const filePath = `${workspaceId}/${contractId}/${file.name}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }

    // Get signed URL (bucket is private)
    const { data: signedData, error: signError } = await supabase.storage
      .from('contracts')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry

    if (signError || !signedData) {
      return NextResponse.json({ error: 'Error al generar URL del archivo' }, { status: 500 })
    }
    const fileUrl = signedData.signedUrl

    // Update contract with PDF URL
    const { error: updateError } = await supabase
      .from('trafficker_contracts')
      .update({
        contract_pdf_url: fileUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .eq('workspace_id', workspaceId)

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar contrato' }, { status: 500 })
    }

    return NextResponse.json({ url: fileUrl })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

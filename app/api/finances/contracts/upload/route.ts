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
      await supabase.storage.createBucket('contracts', { public: true })
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
      console.error('Error uploading file:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('contracts')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // Update contract with PDF URL
    const { error: updateError } = await supabase
      .from('trafficker_contracts')
      .update({
        contract_pdf_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .eq('workspace_id', workspaceId)

    if (updateError) {
      console.error('Error updating contract PDF URL:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('Error in POST /api/finances/contracts/upload:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

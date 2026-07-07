import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, 'upload')
  if (rateLimited) return rateLimited

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ALLOWED_TYPES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'text/csv', 'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.type}` }, { status: 400 })
    }

    const serviceClient = await createServiceRoleClient()
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `uploads/${user.id}/${fileName}`

    const buffer = await file.arrayBuffer()
    const { error } = await serviceClient.storage
      .from('agency-files')
      .upload(filePath, buffer, { contentType: file.type })

    if (error) {
      return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }

    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from('agency-files')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry

    if (signedUrlError) {
      return NextResponse.json({ error: 'Error generando URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signedUrlData.signedUrl, path: filePath })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

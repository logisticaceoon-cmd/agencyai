import { NextResponse } from 'next/server'
import { createSign } from 'crypto'

async function getGoogleAccessToken() {
  const saJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: saJson.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const signingInput = `${encode(header)}.${encode(payload)}`
  const sign = createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign.sign(saJson.private_key, 'base64url')
  const jwt = `${signingInput}.${signature}`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const tokenData = await tokenRes.json() as { access_token: string }
  return tokenData.access_token
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.AGENCYAI_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { url, filename, folderId, mimeType = 'application/pdf' } = await request.json() as {
      url: string; filename: string; folderId?: string; mimeType?: string
    }
    const fileRes = await fetch(url)
    if (!fileRes.ok) throw new Error(`Download failed: ${fileRes.status}`)
    const fileBuffer = await fileRes.arrayBuffer()
    const accessToken = await getGoogleAccessToken()
    const metadata = JSON.stringify({ name: filename, parents: folderId ? [folderId] : [] })
    const boundary = 'ceonyx_boundary_' + Math.random().toString(36).substring(2)
    const metaBytes = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`)
    const filePartHeader = Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`)
    const fileBytes = Buffer.from(fileBuffer)
    const closeBytes = Buffer.from(`\r\n--${boundary}--`)
    const body = Buffer.concat([metaBytes, filePartHeader, fileBytes, closeBytes])
    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    })
    const uploadData = await uploadRes.json() as { id?: string; error?: unknown }
    if (!uploadRes.ok) throw new Error(`Drive upload failed: ${JSON.stringify(uploadData)}`)
    return NextResponse.json({
      success: true,
      fileId: uploadData.id,
      filename,
      viewUrl: `https://drive.google.com/file/d/${uploadData.id}/view`,
    })
  } catch (error) {
    console.error('Drive upload error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

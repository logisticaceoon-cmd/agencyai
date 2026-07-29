import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'
import { sanitizeError } from '@/lib/sanitize-error'
import { createSign } from 'crypto'

// ─── Google Auth ───────────────────────────────────────────────────────────────
async function getGoogleAccessToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no configurado')
  const creds = JSON.parse(raw)
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  })).toString('base64url')
  const sign = createSign('SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(creds.private_key, 'base64url')
  const jwt = `${header}.${payload}.${sig}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google auth error: ${JSON.stringify(data)}`)
  return data.access_token
}

async function findFileInFolder(name: string, parentId: string, token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${name}' and '${parentId}' in parents and trashed=false`)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return (await res.json()).files?.[0]?.id ?? null
}

async function createDriveFolder(name: string, parentId: string, token: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  })
  return (await res.json()).id
}

async function createGoogleDoc(name: string, parentId: string, token: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.document', parents: [parentId] }),
  })
  return (await res.json()).id
}

async function getDocEndIndex(docId: string, token: string): Promise<number> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const doc = await res.json()
  const content = doc.body?.content || []
  const last = content[content.length - 1]
  return (last?.endIndex ?? 1) - 1
}

async function appendToDoc(docId: string, text: string, token: string): Promise<void> {
  const endIndex = await getDocEndIndex(docId, token)
  await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ insertText: { location: { index: endIndex }, text } }] }),
  })
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

// ─── POST /api/cowork/bitacora ─────────────────────────────────────────────────
// Body: { summary: string, decisions?: string[], next_steps?: string[], completed?: string[] }
export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth

    const body = await request.json()
    const { summary, decisions = [], next_steps = [], completed = [] } = body

    if (!summary) {
      return NextResponse.json({ error: 'Campo requerido: summary' }, { status: 400 })
    }

    const BITACORA_FOLDER = process.env.BITACORA_FOLDER_ID || ''
    if (!BITACORA_FOLDER) {
      return NextResponse.json({ error: 'BITACORA_FOLDER_ID no configurado' }, { status: 500 })
    }

    const argNow = new Date(Date.now() - 3 * 60 * 60 * 1000) // UTC-3 Argentina
    const dayName = DAYS_ES[argNow.getUTCDay()]
    const dayNum = argNow.getUTCDate()
    const monthNum = argNow.getUTCMonth()
    const year = argNow.getUTCFullYear()
    const monthName = MONTHS_ES[monthNum]
    const timeStr = `${String(argNow.getUTCHours()).padStart(2,'0')}:${String(argNow.getUTCMinutes()).padStart(2,'0')}`

    const token = await getGoogleAccessToken()
    const monthFolder = `${monthName} ${year}`
    const docName = `Bitácora — ${monthName} ${year}`

    let monthFolderId = await findFileInFolder(monthFolder, BITACORA_FOLDER, token)
    if (!monthFolderId) monthFolderId = await createDriveFolder(monthFolder, BITACORA_FOLDER, token)

    let docId = await findFileInFolder(docName, monthFolderId, token)
    if (!docId) {
      docId = await createGoogleDoc(docName, monthFolderId, token)
      await appendToDoc(docId, `Bitácora mensual — Logística CEOON\n${'═'.repeat(50)}\n\n`, token)
    }

    const sep = `\n${'─'.repeat(40)}\n`
    let entry = `${sep}\n▸ Cierre de sesión — ${dayName} ${dayNum} de ${monthName}, ${year} — ${timeStr} hs (Argentina)\n${'─'.repeat(40)}\n\n`

    entry += `📋 RESUMEN:\n${summary}\n\n`

    if (completed.length > 0) {
      entry += `✅ COMPLETADO HOY:\n${completed.map((t: string) => `  • ${t}`).join('\n')}\n\n`
    }

    if (decisions.length > 0) {
      entry += `🎯 DECISIONES:\n${decisions.map((d: string) => `  • ${d}`).join('\n')}\n\n`
    }

    if (next_steps.length > 0) {
      entry += `⏭️ PRÓXIMOS PASOS:\n${next_steps.map((s: string) => `  • ${s}`).join('\n')}\n\n`
    }

    entry += `Ceonyx · Agente IA — Logística CEOON\n`

    await appendToDoc(docId, entry, token)

    return NextResponse.json({
      success: true,
      message: `Bitácora actualizada — ${dayName} ${dayNum} de ${monthName} ${year}`,
      docId,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('bitacora POST error:', err)
    return NextResponse.json({ error: sanitizeError(err, 'POST /api/cowork/bitacora') }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createSign } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

// ─── Google Auth (Service Account JWT) ──────────────────────────────────────
async function getGoogleAccessToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no configurado en Vercel')
  const creds = JSON.parse(raw)

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    scope: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive',
    ].join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
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

// ─── Google Drive: crear carpeta ─────────────────────────────────────────────
async function createDriveFolder(name: string, parentId: string, token: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })
  const data = await res.json()
  return data.id
}

// ─── Google Drive: crear Google Doc ──────────────────────────────────────────
async function createGoogleDoc(name: string, parentId: string, token: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.document',
      parents: [parentId],
    }),
  })
  const data = await res.json()
  return data.id
}

// ─── Google Docs: obtener end index ──────────────────────────────────────────
async function getDocEndIndex(docId: string, token: string): Promise<number> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const doc = await res.json()
  const content = doc.body?.content || []
  const last = content[content.length - 1]
  return (last?.endIndex ?? 1) - 1
}

// ─── Google Docs: insertar texto ─────────────────────────────────────────────
async function appendToDoc(docId: string, text: string, token: string): Promise<void> {
  const endIndex = await getDocEndIndex(docId, token)
  await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ insertText: { location: { index: endIndex }, text } }],
    }),
  })
}

// ─── Drive: buscar archivo por nombre en carpeta ─────────────────────────────
async function findFileInFolder(name: string, parentId: string, token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${name}' and '${parentId}' in parents and trashed=false`)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const BITACORA_2026_FOLDER = '1283ZE1vPFXmlBnt0nDQoZ2FNDGrwdsrt'
const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

// ─── POST /api/cowork/bitacora ────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth

    const body = await request.json()
    const {
      completed = [],    // string[] — tareas completadas hoy
      inProgress = [],   // string[] — tareas en curso sin terminar
      decisions = [],    // string[] — decisiones tomadas
      nextSteps = [],    // string[] — pendientes para mañana
      notes = '',        // string   — notas adicionales
    } = body

    // Fecha en Argentina
    const argNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const dayName = DAYS_ES[argNow.getUTCDay()]
    const dayNum = argNow.getUTCDate()
    const monthName = MONTHS_ES[argNow.getUTCMonth()]
    const year = argNow.getUTCFullYear()
    const monthFolder = `${monthName} ${year}`
    const docName = `Bitácora — ${monthName} ${year}`

    // Auth Google
    const token = await getGoogleAccessToken()

    // Buscar o crear carpeta del mes
    let monthFolderId = await findFileInFolder(monthFolder, BITACORA_2026_FOLDER, token)
    if (!monthFolderId) {
      monthFolderId = await createDriveFolder(monthFolder, BITACORA_2026_FOLDER, token)
    }

    // Buscar o crear doc del mes
    let docId = await findFileInFolder(docName, monthFolderId, token)
    if (!docId) {
      docId = await createGoogleDoc(docName, monthFolderId, token)
      // Header inicial del doc
      await appendToDoc(docId, `Bitácora mensual — Logística CEOON\n${'═'.repeat(50)}\n\n`, token)
    }

    // Construir entrada del día
    const separator = `\n${'─'.repeat(40)}\n`
    let entry = `${separator}\n▸ ${dayName} ${dayNum} de ${monthName}, ${year}\n${'─'.repeat(40)}\n\n`

    if (completed.length > 0) {
      entry += `✅ COMPLETADO:\n${completed.map((t: string) => `  • ${t}`).join('\n')}\n\n`
    }
    if (inProgress.length > 0) {
      entry += `🔄 EN PROGRESO (continúa mañana):\n${inProgress.map((t: string) => `  • ${t}`).join('\n')}\n\n`
    }
    if (decisions.length > 0) {
      entry += `⚡ DECISIONES:\n${decisions.map((d: string) => `  • ${d}`).join('\n')}\n\n`
    }
    if (nextSteps.length > 0) {
      entry += `➜ PRÓXIMOS PASOS:\n${nextSteps.map((s: string) => `  • ${s}`).join('\n')}\n\n`
    }
    if (notes) {
      entry += `📝 NOTAS: ${notes}\n\n`
    }
    entry += `Registrado por Ceonyx · Agente IA — Logística CEOON\n`

    // Insertar en el doc
    await appendToDoc(docId, entry, token)

    return NextResponse.json({
      success: true,
      message: `Bitácora actualizada: ${dayName} ${dayNum} de ${monthName}`,
      docId,
      monthFolder,
    })
  } catch (err: any) {
    console.error('Error updating bitacora:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createSign } from 'crypto'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'

async function getGoogleAccessToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no configurado en Vercel')
  const creds = JSON.parse(raw)
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    scope: ['https://www.googleapis.com/auth/documents','https://www.googleapis.com/auth/drive'].join(' '),
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

async function findFileInFolder(name: string, parentId: string, token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${name}' and '${parentId}' in parents and trashed=false`)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return (await res.json()).files?.[0]?.id ?? null
}

// ─── Sync tasks to AgencyAi ───────────────────────────────────────────────────
async function syncTasksToAgencyAi(
  supabaseUrl: string,
  supabaseKey: string,
  workspaceId: string,
  completedTitles: string[],
  inProgressTitles: string[]
): Promise<{ updated: number; errors: string[] }> {
  if (completedTitles.length === 0 && inProgressTitles.length === 0) return { updated: 0, errors: [] }

  // Fetch all open tasks
  const res = await fetch(
    `${supabaseUrl}/rest/v1/tasks?workspace_id=eq.${workspaceId}&status=neq.completed&status=neq.cancelled&select=id,title,status&limit=500`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  )
  const tasks = await res.json()
  if (!Array.isArray(tasks)) return { updated: 0, errors: ['Error fetching tasks'] }

  let updated = 0
  const errors: string[] = []

  for (const task of tasks) {
    const titleLower = task.title?.toLowerCase() || ''

    // Check if this task matches a completed title
    const isCompleted = completedTitles.some(t => titleLower.includes(t.toLowerCase().slice(0, 20)))
    // Check if this task matches an in_progress title
    const isInProgress = !isCompleted && inProgressTitles.some(t => titleLower.includes(t.toLowerCase().slice(0, 20)))

    if (isCompleted && task.status !== 'completed') {
      const patchRes = await fetch(
        `${supabaseUrl}/rest/v1/tasks?id=eq.${task.id}&workspace_id=eq.${workspaceId}`,
        {
          method: 'PATCH',
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'completed', updated_at: new Date().toISOString() }),
        }
      )
      if (patchRes.ok) updated++
      else errors.push(`Error updating "${task.title}"`)
    } else if (isInProgress && task.status === 'pending') {
      const patchRes = await fetch(
        `${supabaseUrl}/rest/v1/tasks?id=eq.${task.id}&workspace_id=eq.${workspaceId}`,
        {
          method: 'PATCH',
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'in_progress', updated_at: new Date().toISOString() }),
        }
      )
      if (patchRes.ok) updated++
      else errors.push(`Error updating "${task.title}"`)
    }
  }

  return { updated, errors }
}

const BITACORA_FOLDER = '1283ZE1vPFXmlBnt0nDQoZ2FNDGrwdsrt'
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

export async function POST(request: Request) {
  try {
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth

    const body = await request.json()
    const {
      completed = [],
      inProgress = [],
      decisions = [],
      nextSteps = [],
      notes = '',
    } = body

    const supabaseUrl = process.env.SUPABASE_URL_REAL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY_REAL || ''
    const workspaceId = '41b4b8ab-2483-418d-bb29-d39084ca36f0'

    // ── 1. Sync tasks in AgencyAi ─────────────────────────────────────────────
    const syncResult = await syncTasksToAgencyAi(supabaseUrl, supabaseKey, workspaceId, completed, inProgress)

    // ── 2. Write to Google Docs ───────────────────────────────────────────────
    const argNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const dayName = DAYS_ES[argNow.getUTCDay()]
    const dayNum = argNow.getUTCDate()
    const monthName = MONTHS_ES[argNow.getUTCMonth()]
    const year = argNow.getUTCFullYear()
    const monthFolder = `${monthName} ${year}`
    const docName = `Bitácora — ${monthName} ${year}`

    const token = await getGoogleAccessToken()

    let monthFolderId = await findFileInFolder(monthFolder, BITACORA_FOLDER, token)
    if (!monthFolderId) monthFolderId = await createDriveFolder(monthFolder, BITACORA_FOLDER, token)

    let docId = await findFileInFolder(docName, monthFolderId, token)
    if (!docId) {
      docId = await createGoogleDoc(docName, monthFolderId, token)
      await appendToDoc(docId, `Bitácora mensual — Logística CEOON\n${'═'.repeat(50)}\n\n`, token)
    }

    const sep = `\n${'─'.repeat(40)}\n`
    let entry = `${sep}\n▸ ${dayName} ${dayNum} de ${monthName}, ${year} — Cierre de sesión\n${'─'.repeat(40)}\n\n`

    if (completed.length > 0) entry += `✅ COMPLETADO:\n${completed.map((t: string) => `  • ${t}`).join('\n')}\n\n`
    if (inProgress.length > 0) entry += `🔄 EN PROGRESO:\n${inProgress.map((t: string) => `  • ${t}`).join('\n')}\n\n`
    if (decisions.length > 0) entry += `⚡ DECISIONES:\n${decisions.map((d: string) => `  • ${d}`).join('\n')}\n\n`
    if (nextSteps.length > 0) entry += `➜ PRÓXIMOS PASOS:\n${nextSteps.map((s: string) => `  • ${s}`).join('\n')}\n\n`
    if (notes) entry += `📝 NOTAS: ${notes}\n\n`

    if (syncResult.updated > 0) {
      entry += `🔄 AGENCYAI SINCRONIZADO: ${syncResult.updated} tarea(s) actualizadas automáticamente.\n\n`
    }

    entry += `Registrado por Ceonyx · Agente IA — Logística CEOON\n`

    await appendToDoc(docId, entry, token)

    return NextResponse.json({
      success: true,
      message: `Bitácora actualizada: ${dayName} ${dayNum} de ${monthName}`,
      docId,
      monthFolder,
      agencyAiSync: syncResult,
    })
  } catch (err: any) {
    console.error('Error updating bitacora:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

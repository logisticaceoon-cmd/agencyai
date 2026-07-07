import { NextResponse } from 'next/server'
import { createSign } from 'crypto'

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

const BITACORA_FOLDER = process.env.BITACORA_FOLDER_ID || ''
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

// ─── Task hygiene: auto-sync AgencyAi ────────────────────────────────────────
async function syncAgencyAiTasks(supabaseUrl: string, supabaseKey: string, workspaceId: string, argNow: Date) {
  const results = { flagged: 0, actions: [] as string[] }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/tasks?workspace_id=eq.${workspaceId}&status=in.in_progress,pending,todo&select=id,title,status,due_date,updated_at&limit=500`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  )
  const tasks = await res.json()
  if (!Array.isArray(tasks)) return results

  const now = argNow.getTime()
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000

  for (const task of tasks) {
    const updatedAt = new Date(task.updated_at).getTime()
    const dueDate = task.due_date ? new Date(task.due_date + 'T00:00:00Z') : null
    const isStale = (now - updatedAt) > threeDaysMs && task.status === 'in_progress'
    const isPastDue = dueDate && dueDate < argNow && task.status !== 'completed' && task.status !== 'cancelled'

    // Flag stale in_progress tasks — add a note but don't change status
    if (isStale) {
      results.flagged++
      results.actions.push(`Tarea estancada (>3 días sin cambio): "${task.title}"`)
    }
    if (isPastDue && !isStale) {
      results.flagged++
      results.actions.push(`Tarea vencida sin cerrar: "${task.title}" (vencía ${task.due_date})`)
    }
  }

  return results
}

// ─── GET /api/cron/daily-bitacora ─────────────────────────────────────────────
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const workspaceId = process.env.DEFAULT_WORKSPACE_ID
    if (!workspaceId) {
      return NextResponse.json({ error: 'DEFAULT_WORKSPACE_ID not configured' }, { status: 500 })
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('daily-bitacora: faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Configuración de Supabase no disponible' }, { status: 500 })
    }

    const argNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const dayName = DAYS_ES[argNow.getUTCDay()]
    const dayNum = argNow.getUTCDate()
    const monthNum = argNow.getUTCMonth()
    const year = argNow.getUTCFullYear()
    const monthName = MONTHS_ES[monthNum]
    const isWeekend = argNow.getUTCDay() === 0 || argNow.getUTCDay() === 6

    // Pull tasks from Supabase
    const argDayStart = new Date(argNow); argDayStart.setUTCHours(0,0,0,0)
    const utcDayStart = new Date(argDayStart.getTime() + 3*60*60*1000)
    const utcDayEnd = new Date(utcDayStart.getTime() + 24*60*60*1000)

    const tasksRes = await fetch(
      `${supabaseUrl}/rest/v1/tasks?workspace_id=eq.${workspaceId}&select=title,status,updated_at`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const allTasks = await tasksRes.json()

    const completedToday = (Array.isArray(allTasks) ? allTasks : [])
      .filter((t: any) => {
        if (t.status !== 'completed') return false
        const updated = new Date(t.updated_at)
        return updated >= utcDayStart && updated < utcDayEnd
      }).map((t: any) => t.title)

    const inProgress = (Array.isArray(allTasks) ? allTasks : [])
      .filter((t: any) => t.status === 'in_progress')
      .map((t: any) => t.title)

    // Task hygiene check
    const hygiene = isWeekend ? { flagged: 0, actions: [] } : await syncAgencyAiTasks(supabaseUrl, supabaseKey, workspaceId, argNow)

    // Google Docs
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
    let entry = `${sep}\n▸ ${dayName} ${dayNum} de ${monthName}, ${year}${isWeekend ? ' (fin de semana)' : ''}\n${'─'.repeat(40)}\n\n`

    if (isWeekend) {
      entry += `📅 Día no laborable — sin registro de actividad.\n\nCeonyx · Agente IA — Logística CEOON\n`
    } else {
      entry += completedToday.length > 0
        ? `✅ COMPLETADO:\n${completedToday.map((t: string) => `  • ${t}`).join('\n')}\n\n`
        : `✅ COMPLETADO:\n  • Sin tareas cerradas en AgencyAi hoy\n\n`

      if (inProgress.length > 0) {
        entry += `🔄 EN PROGRESO:\n${inProgress.map((t: string) => `  • ${t}`).join('\n')}\n\n`
      }

      if (hygiene.flagged > 0) {
        entry += `⚠️ REVISIÓN DE TAREAS (${hygiene.flagged} items):\n${hygiene.actions.map(a => `  • ${a}`).join('\n')}\n\n`
      }

      entry += `⚠️ Para decisiones y próximos pasos detallados, ver cierre manual de sesión.\n\nCeonyx · Agente IA — Logística CEOON\n`
    }

    await appendToDoc(docId, entry, token)

    return NextResponse.json({
      success: true,
      date: `${dayName} ${dayNum} de ${monthName} ${year}`,
      completedCount: completedToday.length,
      inProgressCount: inProgress.length,
      hygieneFlagged: hygiene.flagged,
      hygieneActions: hygiene.actions,
      docId,
    })
  } catch (err: any) {
    console.error('daily-bitacora error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

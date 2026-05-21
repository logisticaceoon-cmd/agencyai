import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
// @ts-ignore
import { ImapFlow } from 'imapflow'

const CRON_SECRET = process.env.CRON_SECRET || ''
const GMAIL_USER = process.env.GMAIL_USER || 'logisticaceoon@gmail.com'
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''

// Workspace members to monitor
const TEAM_EMAILS = [
  'stephany.acp@gmail.com',
  'rafaelb2512@gmail.com',
  'jessicaporras39266@gmail.com',
  'logisticaceoon@gmail.com',
]

// Labels to identify Ceonyx-sent emails (subject keywords)
const CEONYX_SUBJECT_KEYWORDS = [
  'ceonyx',
  'agencyai',
  'logística ceoon',
  'logistica ceoon',
  'ceoon',
]

interface EmailSummary {
  from: string
  subject: string
  date: string
  snippet: string
  isReply: boolean
  isFromTeam: boolean
}

export async function GET(request: Request) {
  // Auth check for Vercel cron
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseKey) {
    console.error('email-check: faltan variables de Supabase')
    return NextResponse.json({ error: 'Config faltante' }, { status: 500 })
  }

  if (!GMAIL_APP_PASSWORD) {
    console.error('email-check: falta GMAIL_APP_PASSWORD')
    return NextResponse.json({ error: 'GMAIL_APP_PASSWORD no configurada' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const hour = new Date().getUTCHours()
  const checkPeriod = hour <= 14 ? 'mañana' : 'tarde'
  const hoursBack = 13 // scan last 13 hours to avoid gaps between 10am and 6pm

  console.log(`[email-check] Iniciando revisión de ${checkPeriod} — últimas ${hoursBack}h`)

  let client: any = null
  const foundEmails: EmailSummary[] = []

  try {
    // Connect to Gmail via IMAP
    client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
      logger: false,
    })

    await client.connect()

    const lock = await client.getMailboxLock('INBOX')

    try {
      // Search for emails in the last hoursBack hours
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

      const searchResults = await client.search({
        since: since,
      })

      if (searchResults && searchResults.length > 0) {
        // Fetch details for found messages
        const fetchLimit = Math.min(searchResults.length, 30)
        const uidsToFetch = searchResults.slice(-fetchLimit)

        for await (const msg of client.fetch(uidsToFetch, {
          envelope: true,
          bodyStructure: false,
          bodyParts: ['TEXT'],
        })) {
          const from = msg.envelope?.from?.[0]?.address || ''
          const subject = msg.envelope?.subject || '(sin asunto)'
          const date = msg.envelope?.date?.toISOString() || new Date().toISOString()

          // Check if from team member
          const isFromTeam = TEAM_EMAILS.some(e => from.toLowerCase().includes(e.toLowerCase()))

          // Check if it's a reply to a Ceonyx email
          const subjectLower = subject.toLowerCase()
          const isReply = subjectLower.startsWith('re:') &&
            CEONYX_SUBJECT_KEYWORDS.some(kw => subjectLower.includes(kw))

          // Only capture if from team OR reply to Ceonyx
          if (isFromTeam || isReply) {
            // Get text snippet
            let snippet = ''
            try {
              const bodyPart = msg.bodyParts?.get('TEXT')
              if (bodyPart) {
                const raw = Buffer.from(bodyPart).toString('utf-8')
                // Strip HTML if present
                snippet = raw
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .substring(0, 300)
              }
            } catch { /* body snippet optional */ }

            foundEmails.push({
              from,
              subject,
              date,
              snippet,
              isReply,
              isFromTeam,
            })
          }
        }
      }
    } finally {
      lock.release()
    }

    await client.logout()
    client = null

    console.log(`[email-check] Encontrados: ${foundEmails.length} emails relevantes`)

    if (foundEmails.length === 0) {
      // Log silently — no relevant emails
      await logToSupabase(supabase, checkPeriod, 0, 'Sin emails relevantes en este período.')
      return NextResponse.json({
        success: true,
        found: 0,
        period: checkPeriod,
        message: 'Sin emails relevantes',
      })
    }

    // Build summary
    const summary = buildSummary(foundEmails, checkPeriod)

    // Save to Supabase as a nota/minuta
    await logToSupabase(supabase, checkPeriod, foundEmails.length, summary)

    // Send summary email to Rafael
    await sendSummaryEmail(foundEmails, summary, checkPeriod)

    return NextResponse.json({
      success: true,
      found: foundEmails.length,
      period: checkPeriod,
      summary,
    })
  } catch (err: any) {
    console.error('[email-check] Error:', err?.message || err)
    if (client) {
      try { await client.logout() } catch { /* ignore */ }
    }
    return NextResponse.json({
      error: `Error revisando emails: ${err?.message || 'desconocido'}`,
    }, { status: 500 })
  }
}

function buildSummary(emails: EmailSummary[], period: string): string {
  const lines: string[] = [`📬 Revisión de emails — ${period}`]

  const replies = emails.filter(e => e.isReply)
  const teamEmails = emails.filter(e => e.isFromTeam && !e.isReply)

  if (replies.length > 0) {
    lines.push(`\n🔁 Respuestas a Ceonyx (${replies.length}):`)
    replies.forEach(e => {
      lines.push(`  • De: ${e.from}`)
      lines.push(`    Asunto: ${e.subject}`)
      if (e.snippet) lines.push(`    "${e.snippet.substring(0, 150)}..."`)
    })
  }

  if (teamEmails.length > 0) {
    lines.push(`\n👥 Emails del equipo (${teamEmails.length}):`)
    teamEmails.forEach(e => {
      lines.push(`  • De: ${e.from} — "${e.subject}"`)
    })
  }

  return lines.join('\n')
}

async function logToSupabase(supabase: any, period: string, count: number, summary: string) {
  const WORKSPACE_ID = '41b4b8ab-2483-418d-bb29-d39084ca36f0'
  const RAFAEL_ID = '2346440f-1d44-4327-9866-e442ec1ab7c2'

  try {
    await supabase.from('tasks').insert({
      workspace_id: WORKSPACE_ID,
      title: `[Ceonyx] Revisión emails ${period} — ${count} relevante${count !== 1 ? 's' : ''} — ${new Date().toLocaleDateString('es-AR')}`,
      description: summary,
      status: 'completed',
      priority: count > 0 ? 'high' : 'low',
      createdById: RAFAEL_ID,
      assignedTo: [],
      deadline: new Date().toISOString().split('T')[0],
    })
  } catch (err) {
    console.error('[email-check] Error logging to Supabase:', err)
  }
}

async function sendSummaryEmail(emails: EmailSummary[], summary: string, period: string) {
  if (!GMAIL_APP_PASSWORD) return

  const hasReplies = emails.some(e => e.isReply)
  const subject = hasReplies
    ? `⚡ Ceonyx — Hay respuestas pendientes de revisar (${period})`
    : `📬 Ceonyx — Actividad de email del equipo (${period})`

  const htmlRows = emails.map(e => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:8px 12px;font-size:13px">${e.isReply ? '🔁 Respuesta' : '📨 Email equipo'}</td>
      <td style="padding:8px 12px;font-size:13px">${e.from}</td>
      <td style="padding:8px 12px;font-size:13px">${e.subject}</td>
      <td style="padding:8px 12px;font-size:12px;color:#666">${e.snippet ? e.snippet.substring(0, 100) + '...' : '—'}</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#1a1a1a">
    <h2 style="font-size:18px;margin-bottom:4px">Revisión de Emails — ${period}</h2>
    <p style="color:#666;font-size:13px;margin-top:0">${new Date().toLocaleDateString('es-AR', {weekday:'long',day:'numeric',month:'long'})} · ${emails.length} email${emails.length !== 1 ? 's' : ''} relevante${emails.length !== 1 ? 's' : ''}</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9f9f9;border-radius:8px;overflow:hidden">
      <thead>
        <tr style="background:#111;color:#fff">
          <th style="padding:10px 12px;text-align:left;font-size:12px">Tipo</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px">De</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px">Asunto</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px">Extracto</th>
        </tr>
      </thead>
      <tbody>${htmlRows}</tbody>
    </table>

    ${hasReplies ? '<p style="background:#fff3cd;padding:12px 16px;border-left:4px solid #ffc107;border-radius:4px;font-size:14px">⚡ Hay respuestas que requieren tu atención. Entrá a tu Gmail para responder.</p>' : ''}

    <p style="margin-top:32px;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:16px">
      Ceonyx · Agente IA — Logística CEOON<br>
      Revisión automática ${period} · Lun–Vie · Sin PC encendida
    </p>
    </body></html>
  `

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })

    await transporter.sendMail({
      from: `Ceonyx <${GMAIL_USER}>`,
      to: 'logisticaceoon@gmail.com',
      subject,
      html,
    })

    console.log('[email-check] Summary email sent to Rafael')
  } catch (err) {
    console.error('[email-check] Error sending summary email:', err)
  }
}

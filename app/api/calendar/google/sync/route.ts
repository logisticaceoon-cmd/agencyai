import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

async function getServiceAccountToken(calendarEmail: string): Promise<string | null> {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!saJson) return null

  try {
    const sa = JSON.parse(saJson)
    const now = Math.floor(Date.now() / 1000)
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      // sub only needed for domain-wide delegation
    })).toString('base64url')

    const { createSign } = await import('crypto')
    const sign = createSign('RSA-SHA256')
    sign.update(`${header}.${payload}`)
    const signature = sign.sign(sa.private_key, 'base64url')
    const jwt = `${header}.${payload}.${signature}`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!tokenRes.ok) return null
    const tokenData = await tokenRes.json()
    return tokenData.access_token || null
  } catch (e) {
    console.error('Service account token error:', e)
    return null
  }
}

export async function GET() {
  try {
    // Verify user is authenticated
    const anonClient = await createClient()
    const { data: { user } } = await anonClient.auth.getUser()
    if (!user) return NextResponse.json({ connected: false, events: [], error: 'Not authenticated' })

    const supabase = createAdminClient()

    // Get workspace
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!ws) {
      const { data: mem } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!mem) return NextResponse.json({ connected: false, events: [] })
    }

    const workspaceId = ws?.id

    // 1. Try stored OAuth tokens first
    const { data: tokenRow } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()

    let accessToken: string | null = null
    let calendarId = 'primary'

    if (tokenRow) {
      accessToken = tokenRow.access_token

      // Refresh if expired
      if (tokenRow.expiry_date && Date.now() > tokenRow.expiry_date && tokenRow.refresh_token) {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        if (clientId && clientSecret) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: tokenRow.refresh_token,
              grant_type: 'refresh_token',
            }),
          })
          if (refreshRes.ok) {
            const refreshed = await refreshRes.json()
            accessToken = refreshed.access_token
            await supabase.from('google_calendar_tokens').update({
              access_token: refreshed.access_token,
              expiry_date: refreshed.expires_in ? Date.now() + refreshed.expires_in * 1000 : tokenRow.expiry_date,
            }).eq('id', tokenRow.id)
          }
        }
      }
    }

    // 2. Fallback: try service account (requires calendar shared with service account)
    if (!accessToken) {
      const saToken = await getServiceAccountToken(user.email || '')
      if (saToken) {
        accessToken = saToken
        // For service account, we need the actual calendar ID (user's email)
        // The calendar must be shared with the service account
        calendarId = user.email || 'primary'
      }
    }

    if (!accessToken) {
      return NextResponse.json({
        connected: false,
        events: [],
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_JSON
          ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email
          : null,
      })
    }

    const now = new Date()
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        new URLSearchParams({
          timeMin,
          timeMax,
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '250',
        }),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!calRes.ok) {
      const errText = await calRes.text()
      console.error('Calendar API error:', calRes.status, errText)
      return NextResponse.json({
        connected: tokenRow ? true : false,
        events: [],
        error: calRes.status === 403 || calRes.status === 404
          ? 'calendar_not_shared'
          : 'api_error',
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_JSON
          ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email
          : null,
      })
    }

    const calData = await calRes.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (calData.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary || 'Sin titulo',
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      description: item.description || '',
      htmlLink: item.htmlLink || '',
      allDay: !item.start?.dateTime,
    }))

    return NextResponse.json({ connected: true, events, source: tokenRow ? 'oauth' : 'service_account' })
  } catch (err) {
    console.error('Google calendar sync error:', err)
    return NextResponse.json({ connected: false, events: [], error: 'internal' })
  }
}

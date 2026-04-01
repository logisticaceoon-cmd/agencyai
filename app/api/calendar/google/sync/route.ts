import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null
  return res.json()
}

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const supabase = await createServerSupabaseClient()

  // Get stored tokens
  const { data: tokenRow } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('workspace_id', ctx.org.id)
    .eq('user_id', ctx.membership.userId)
    .single()

  if (!tokenRow) {
    return NextResponse.json({ connected: false, events: [] })
  }

  let accessToken = tokenRow.access_token

  // Check if token is expired
  if (tokenRow.expiry_date && Date.now() > tokenRow.expiry_date) {
    if (!tokenRow.refresh_token) {
      return NextResponse.json({ connected: false, events: [], error: 'Token expired, reconnect required' })
    }
    const refreshed = await refreshAccessToken(tokenRow.refresh_token)
    if (!refreshed?.access_token) {
      return NextResponse.json({ connected: false, events: [], error: 'Failed to refresh token' })
    }
    accessToken = refreshed.access_token

    // Update stored token
    await supabase
      .from('google_calendar_tokens')
      .update({
        access_token: refreshed.access_token,
        expiry_date: refreshed.expires_in
          ? Date.now() + refreshed.expires_in * 1000
          : tokenRow.expiry_date,
      })
      .eq('id', tokenRow.id)
  }

  // Fetch events from Google Calendar
  try {
    const now = new Date()
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin,
          timeMax,
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '100',
        }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!calRes.ok) {
      return NextResponse.json({ connected: true, events: [], error: 'Failed to fetch events' })
    }

    const calData = await calRes.json()

    const events = (calData.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary || 'Sin titulo',
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      description: item.description || '',
      location: item.location || '',
      htmlLink: item.htmlLink || '',
    }))

    return NextResponse.json({ connected: true, events })
  } catch {
    return NextResponse.json({ connected: true, events: [], error: 'API error' })
  }
}

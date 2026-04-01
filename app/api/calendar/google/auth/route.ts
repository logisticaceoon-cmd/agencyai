import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Google Calendar not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.' },
      { status: 400 }
    )
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
  ].join(' ')

  const state = JSON.stringify({ workspaceId: ctx.org.id, userId: ctx.membership.userId })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state: Buffer.from(state).toString('base64'),
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return NextResponse.redirect(authUrl)
}

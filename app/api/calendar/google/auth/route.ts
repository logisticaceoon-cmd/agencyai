import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createHmac } from 'crypto'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { workspaceId, userId } = auth

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

    const stateData = JSON.stringify({ workspaceId, userId })
    const hmacSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const sig = createHmac('sha256', hmacSecret).update(stateData).digest('hex')
    const state = Buffer.from(JSON.stringify({ data: stateData, sig })).toString('base64url')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.redirect(authUrl)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    return NextResponse.json({ data: [] })
  } catch (err) {
    console.error('Error fetching recordings:', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    return NextResponse.json({ data: null, error: 'Not implemented yet' }, { status: 501 })
  } catch (err) {
    console.error('Error creating recording:', err)
    return NextResponse.json({ error: 'Error creating recording' }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, 'auth')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json()
    const { email, fullName } = body

    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email and fullName required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if user already exists via workspace_members
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ user: { id: existing.user_id, email, fullName } })
    }

    return NextResponse.json({ user: { email, fullName } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

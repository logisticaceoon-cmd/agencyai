import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ exists: false, error: 'Email requerido' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      return NextResponse.json({ exists: true })
    }

    const exists = data.users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    return NextResponse.json({ exists })
  } catch {
    return NextResponse.json({ exists: true })
  }
}

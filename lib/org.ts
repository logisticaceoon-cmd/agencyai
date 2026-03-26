import { createServerSupabaseClient } from './supabase-server'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'

/**
 * Get the current user + their active organization from an API route request.
 * Returns { user, org, membership } or a NextResponse error.
 */
export async function getOrgContext(request?: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
    include: {
      organizationMembers: {
        where: { status: 'active' },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  })

  if (!user) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }

  const membership = user.organizationMembers[0] ?? null
  const org = membership?.organization ?? null

  if (!org) {
    return { error: NextResponse.json({ error: 'No organization found' }, { status: 403 }) }
  }

  return { user, org, membership }
}

/**
 * Same as getOrgContext but only requires auth (no org needed).
 */
export async function getAuthContext() {
  const supabase = await createServerSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
  })

  if (!user) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }

  return { user }
}

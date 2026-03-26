import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: {
        organizationMembers: {
          where: { status: 'active' },
          include: {
            organization: {
              select: { id: true, name: true, slug: true, plan: true, maxUsers: true, maxClients: true },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const org = dbUser.organizationMembers[0]?.organization ?? null
    const { organizationMembers: _, ...userWithoutMembers } = dbUser

    return NextResponse.json({ user: userWithoutMembers, org })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.user.update({
      where: { email: user.email! },
      data: { lastLogin: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

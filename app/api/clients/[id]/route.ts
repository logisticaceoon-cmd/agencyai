import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        accountManager: true,
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { createdBy: { select: { id: true, fullName: true } } },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { submittedBy: { select: { id: true, fullName: true } } },
        },
        audits: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { createdBy: { select: { id: true, fullName: true } } },
        },
      },
    })

    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: client })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser || dbUser.role === 'Team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...body,
        contractStart: body.contractStart ? new Date(body.contractStart) : undefined,
        contractEnd: body.contractEnd ? new Date(body.contractEnd) : undefined,
      },
    })

    return NextResponse.json({ data: client })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

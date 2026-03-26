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

    const doc = await prisma.documentation.findUnique({
      where: { id },
      include: { author: { select: { id: true, fullName: true } } },
    })

    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: doc })
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
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const existing = await prisma.documentation.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()

    const doc = await prisma.documentation.update({
      where: { id },
      data: {
        ...body,
        version: existing.version + 1,
        versionNotes: body.versionNotes || `Actualizado por ${dbUser.fullName}`,
      },
    })

    return NextResponse.json({ data: doc })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

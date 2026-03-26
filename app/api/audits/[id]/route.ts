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

    const audit = await prisma.audit.findUnique({
      where: { id },
      include: {
        createdBy: true,
        client: true,
      },
    })

    if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: audit })
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

    // Calculate score if findings provided
    let complianceScore: number | undefined
    let overallStatus: any
    if (body.findings?.checklist) {
      const checklist = body.findings.checklist as Array<{ result: string | null }>
      const total = checklist.length
      if (total > 0) {
        const passed = checklist.filter((i) => i.result === 'compliant').length
        const partial = checklist.filter((i) => i.result === 'partial').length
        complianceScore = Math.round(((passed * 1.0 + partial * 0.5) / total) * 100)
        overallStatus = complianceScore >= 90 ? 'compliant' : complianceScore >= 70 ? 'partial' : 'non_compliant'
      }
    }

    const audit = await prisma.audit.update({
      where: { id },
      data: {
        findings: body.findings,
        notes: body.notes,
        correctiveActions: body.correctiveActions,
        correctiveActionsDue: body.correctiveActionsDue ? new Date(body.correctiveActionsDue) : undefined,
        status: body.status,
        ...(complianceScore !== undefined && { complianceScore, overallStatus, executedAt: new Date() }),
      },
    })

    return NextResponse.json({ data: audit })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

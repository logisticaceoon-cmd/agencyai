import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'

const schema = z.object({
  action: z.enum(['validated', 'rejected', 'review']),
  validationComments: z.string().optional(),
})

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
    const { action, validationComments } = schema.parse(body)

    const report = await prisma.report.update({
      where: { id },
      data: {
        status: action,
        validatedById: dbUser.id,
        validatedAt: new Date(),
        validationComments,
      },
    })

    await createNotification({
      userId: report.submittedById,
      title: action === 'validated' ? 'Reporte validado ✅' : action === 'rejected' ? 'Reporte rechazado ❌' : 'Reporte en revisión',
      message: `Tu reporte "${report.title}" fue ${action === 'validated' ? 'validado' : action === 'rejected' ? 'rechazado' : 'puesto en revisión'}`,
      type: 'report',
      relatedEntityType: 'report',
      relatedEntityId: id,
    })

    return NextResponse.json({ data: report })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

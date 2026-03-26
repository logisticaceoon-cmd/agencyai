import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createNotificationForMultiple } from '@/lib/notifications'

const schema = z.object({
  action: z.enum(['validated', 'rejected', 'review']),
  validationNotes: z.string().optional(),
})

export async function POST(
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
    const { action, validationNotes } = schema.parse(body)

    const task = await prisma.task.update({
      where: { id },
      data: {
        status: action === 'validated' ? 'completed' : action === 'rejected' ? 'rejected' : 'in_progress',
        validatedById: dbUser.id,
        validatedAt: new Date(),
        validationNotes,
      },
    })

    // Notify assignees
    const messages = {
      validated: `Tu tarea fue validada ✅: ${task.title}`,
      rejected: `Tu tarea fue rechazada ❌: ${task.title}${validationNotes ? ` — ${validationNotes}` : ''}`,
      review: `Tu tarea requiere revisión ⚠️: ${task.title}`,
    }

    await createNotificationForMultiple(task.assignedTo, {
      title: action === 'validated' ? 'Tarea validada' : action === 'rejected' ? 'Tarea rechazada' : 'Tarea en revisión',
      message: messages[action],
      type: 'task',
      relatedEntityType: 'task',
      relatedEntityId: id,
    })

    await prisma.activityLog.create({
      data: {
        userId: dbUser.id,
        actionType: `task_${action}`,
        entityType: 'task',
        entityId: id,
        taskId: id,
        description: `Tarea ${action} por ${dbUser.fullName}`,
      },
    })

    return NextResponse.json({ data: task })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

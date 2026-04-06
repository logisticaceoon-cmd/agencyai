import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [members, allTasks] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: ctx.org.id, status: 'active' },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.task.findMany({
      where: { organizationId: ctx.org.id },
      select: { assignedTo: true, status: true, updatedAt: true },
    }),
  ])

  const teamStatus = members.map(({ user }) => {
    let assigned = 0
    let completed = 0
    for (const t of allTasks) {
      const assignees = (t.assignedTo as string[] | null) || []
      if (!assignees.includes(user.id)) continue
      if (t.status === 'pending' || t.status === 'in_progress') {
        assigned++
      } else if (t.status === 'completed' && t.updatedAt && new Date(t.updatedAt) >= sevenDaysAgo) {
        completed++
      }
    }

    const workloadPercent = Math.min(Math.round((assigned / 8) * 100), 100)
    const status =
      workloadPercent >= 95 ? 'overloaded' : workloadPercent >= 75 ? 'monitor' : 'on_track'

    return { user, tasksAssigned: assigned, tasksCompleted: completed, workloadPercent, status }
  })

  return NextResponse.json({ team: teamStatus })
}

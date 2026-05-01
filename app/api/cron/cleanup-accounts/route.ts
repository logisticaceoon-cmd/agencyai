import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cron/cleanup-accounts
// Vercel Cron: ejecuta diariamente a las 3 AM UTC
// Borra permanentemente las cuentas desactivadas donde delete_after < now
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  // Verificar que viene de Vercel Cron o de un request autorizado
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Encontrar todas las organizaciones cuyo período de retención expiró
    const expiredOrgs = await prisma.organization.findMany({
      where: {
        status: 'deactivated',
        deleteAfter: { lte: now },
      },
      select: { id: true, name: true, slug: true, deleteAfter: true },
    })

    if (expiredOrgs.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No hay cuentas expiradas para eliminar',
        checkedAt: now.toISOString(),
      })
    }

    const deletedIds: string[] = []
    const errors: string[] = []

    for (const org of expiredOrgs) {
      try {
        // Borrar en orden para respetar FK constraints
        // (Prisma onDelete: Cascade debería manejarlo, pero lo hacemos explícito)
        await prisma.$transaction([
          prisma.notification.deleteMany({ where: { organizationId: org.id } }),
          prisma.activityLog.deleteMany({ where: { organizationId: org.id } }),
          prisma.recording.deleteMany({ where: { organizationId: org.id } }),
          prisma.meeting.deleteMany({ where: { organizationId: org.id } }),
          prisma.kPI.deleteMany({ where: { organizationId: org.id } }),
          prisma.objective.deleteMany({ where: { organizationId: org.id } }),
          prisma.finance.deleteMany({ where: { organizationId: org.id } }),
          prisma.audit.deleteMany({ where: { organizationId: org.id } }),
          prisma.report.deleteMany({ where: { organizationId: org.id } }),
          prisma.task.deleteMany({ where: { organizationId: org.id } }),
          prisma.project.deleteMany({ where: { organizationId: org.id } }),
          prisma.client.deleteMany({ where: { organizationId: org.id } }),
          prisma.invitation.deleteMany({ where: { organizationId: org.id } }),
          prisma.organizationMember.deleteMany({ where: { organizationId: org.id } }),
          prisma.organization.delete({ where: { id: org.id } }),
        ])

        deletedIds.push(org.id)
        console.log(`[cleanup-accounts] Organización eliminada: ${org.name} (${org.id}) — deleteAfter: ${org.deleteAfter}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${org.id} (${org.name}): ${msg}`)
        console.error(`[cleanup-accounts] Error eliminando ${org.name}:`, msg)
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
      checkedAt: now.toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cleanup-accounts] Error general:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

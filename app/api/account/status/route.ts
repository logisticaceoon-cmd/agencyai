import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { prisma } from '@/lib/prisma'

// GET /api/account/status
// Retorna el estado actual de la cuenta del usuario.
export async function GET() {
  const auth = await getAuthContext()
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: auth.workspaceId },
      select: {
        id: true,
        status: true,
        plan: true,
        deactivatedAt: true,
        deleteAfter: true,
        cancellationScheduledAt: true,
        stripeCustomerId: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    const now = new Date()
    const daysUntilDeletion = org.deleteAfter
      ? Math.ceil((org.deleteAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return NextResponse.json({
      status: org.status,
      plan: org.plan,
      deactivatedAt: org.deactivatedAt,
      deleteAfter: org.deleteAfter,
      cancellationScheduledAt: org.cancellationScheduledAt,
      daysUntilDeletion,
      hasStripe: !!org.stripeCustomerId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error obteniendo estado de cuenta:', message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

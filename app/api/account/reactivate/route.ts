import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { prisma } from '@/lib/prisma'

// POST /api/account/reactivate
// Reactiva una cuenta desactivada (el usuario pagó de nuevo).
export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth

  try {
    const org = await prisma.organization.findUnique({
      where: { id: auth.workspaceId },
      select: { id: true, status: true, ownerId: true, deleteAfter: true },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    if (org.ownerId !== auth.userId) {
      return NextResponse.json({ error: 'Solo el dueño puede reactivar la cuenta' }, { status: 403 })
    }

    if (org.status === 'active') {
      return NextResponse.json({ error: 'La cuenta ya está activa' }, { status: 400 })
    }

    // Verificar que no haya pasado la fecha de borrado
    if (org.deleteAfter && new Date() > org.deleteAfter) {
      return NextResponse.json({
        error: 'El período de retención expiró. Los datos ya no están disponibles.',
      }, { status: 410 })
    }

    await prisma.organization.update({
      where: { id: auth.workspaceId },
      data: {
        status: 'active',
        deactivatedAt: null,
        deleteAfter: null,
        cancellationScheduledAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Cuenta reactivada exitosamente. Todos tus datos han sido restaurados.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error al reactivar cuenta:', message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

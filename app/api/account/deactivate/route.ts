import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { prisma } from '@/lib/prisma'

// POST /api/account/deactivate
// Desactiva la cuenta del usuario. Los datos se conservan 90 días.
export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth

  try {
    const org = await prisma.organization.findUnique({
      where: { id: auth.workspaceId },
      select: { id: true, status: true, ownerId: true },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    if (org.ownerId !== auth.userId) {
      return NextResponse.json({ error: 'Solo el dueño puede desactivar la cuenta' }, { status: 403 })
    }

    if (org.status === 'deactivated') {
      return NextResponse.json({ error: 'La cuenta ya está desactivada' }, { status: 400 })
    }

    const now = new Date()
    const deleteAfter = new Date(now)
    deleteAfter.setDate(deleteAfter.getDate() + 90)

    await prisma.organization.update({
      where: { id: auth.workspaceId },
      data: {
        status: 'deactivated',
        deactivatedAt: now,
        deleteAfter: deleteAfter,
        plan: 'free',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Cuenta desactivada. Tus datos serán conservados hasta el ' + deleteAfter.toLocaleDateString('es-ES'),
      deleteAfter: deleteAfter.toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error al desactivar cuenta:', message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

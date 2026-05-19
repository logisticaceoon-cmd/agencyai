import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET /api/setup/member-assignments
 * One-time DDL: crea tabla member_client_assignments si no existe.
 * Protegido por CRON_SECRET.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET || 'ceoon-setup-2026'
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.member_client_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL,
        member_user_id UUID NOT NULL,
        client_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(workspace_id, member_user_id, client_id)
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_mca_workspace ON public.member_client_assignments(workspace_id)
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_mca_member ON public.member_client_assignments(workspace_id, member_user_id)
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_mca_client ON public.member_client_assignments(workspace_id, client_id)
    `)

    return NextResponse.json({
      ok: true,
      message: 'member_client_assignments table ready',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

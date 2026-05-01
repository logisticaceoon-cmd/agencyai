import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint temporal para migración de account lifecycle — BORRAR después de correr una vez
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  try {
    // Agregar columnas una por una para mejor diagnóstico
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`
      )
      results['status_col'] = 'ok'
    } catch (e: any) {
      results['status_col'] = e.message
    }

    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ`
      )
      results['deactivated_at_col'] = 'ok'
    } catch (e: any) {
      results['deactivated_at_col'] = e.message
    }

    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS delete_after TIMESTAMPTZ`
      )
      results['delete_after_col'] = 'ok'
    } catch (e: any) {
      results['delete_after_col'] = e.message
    }

    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cancellation_scheduled_at TIMESTAMPTZ`
      )
      results['cancellation_col'] = 'ok'
    } catch (e: any) {
      results['cancellation_col'] = e.message
    }

    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`
      )
      results['stripe_customer_id_col'] = 'ok'
    } catch (e: any) {
      results['stripe_customer_id_col'] = e.message
    }

    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_org_delete_after ON public.organizations(delete_after) WHERE delete_after IS NOT NULL`
      )
      results['idx_delete_after'] = 'ok'
    } catch (e: any) {
      results['idx_delete_after'] = e.message
    }

    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_org_status ON public.organizations(status)`
      )
      results['idx_status'] = 'ok'
    } catch (e: any) {
      results['idx_status'] = e.message
    }

    // Verify columns exist
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name IN ('status','deactivated_at','delete_after','cancellation_scheduled_at','stripe_customer_id')
      ORDER BY column_name
    `)

    return NextResponse.json({ success: true, results, columns: cols })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, results }, { status: 500 })
  }
}

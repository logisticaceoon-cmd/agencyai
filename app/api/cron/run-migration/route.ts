import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint temporal para migración — BORRAR después de correr una vez
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  const migrations: [string, string][] = [
    ['status', `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','deactivated'))`],
    ['deactivated_at', 'ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ'],
    ['delete_after', 'ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS delete_after TIMESTAMPTZ'],
    ['cancellation_scheduled_at', 'ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cancellation_scheduled_at TIMESTAMPTZ'],
    ['stripe_customer_id', 'ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT'],
    ['idx_delete_after', 'CREATE INDEX IF NOT EXISTS idx_organizations_delete_after ON public.organizations(delete_after) WHERE delete_after IS NOT NULL'],
    ['idx_status', 'CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status)'],
  ]

  for (const [name, sql] of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql)
      results[name] = 'ok'
    } catch (e: any) {
      if (/already exist/i.test(e.message)) {
        results[name] = 'already_exists'
      } else {
        results[name] = `error: ${e.message}`
      }
    }
  }

  // Verify
  const cols: any[] = await prisma.$queryRaw`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name IN ('status','deactivated_at','delete_after','cancellation_scheduled_at','stripe_customer_id')
    ORDER BY column_name
  `

  return NextResponse.json({ results, columns: cols })
}

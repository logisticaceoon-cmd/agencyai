import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint temporal para migración de account lifecycle — BORRAR después de correr una vez
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Test 1: ORM query (should work)
    const orgCount = await prisma.organization.count()

    // Test 2: Raw SELECT (test raw connection)
    let rawTest: any = null
    let rawError: string | null = null
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT count(*) as n FROM public.organizations`)
      rawTest = result
    } catch (e: any) {
      rawError = e.message
    }

    // Test 3: Try ALTER TABLE
    let ddlResult: string = 'not_tried'
    if (!rawError) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`
        )
        ddlResult = 'ok'
      } catch (e: any) {
        ddlResult = e.message.slice(0, 200)
      }
    }

    return NextResponse.json({
      orm_count: orgCount,
      raw_select: rawTest,
      raw_error: rawError,
      ddl: ddlResult,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// One-time migration endpoint — protected by AGENCYAI_CRON_SECRET
// Call: POST /api/admin/migrate {"secret": "..."}
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const cronSecret = process.env.CRON_SECRET || process.env.AGENCYAI_CRON_SECRET || 'ceoon-migrate-2026'
    if (body.secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // We run each DDL statement via supabase.rpc calls through pg
    // Since Supabase doesn't support raw DDL via REST, we use Prisma
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const results: string[] = []

    try {
      // 1. Create workspace_roles table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.workspace_roles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
          key TEXT NOT NULL,
          label TEXT NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#6366f1',
          base_role TEXT NOT NULL DEFAULT 'trafficker'
            CHECK (base_role IN ('owner','admin','trafficker','viewer')),
          is_system BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(workspace_id, key)
        )
      `)
      results.push('workspace_roles table: OK')

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_workspace_roles_workspace
        ON public.workspace_roles(workspace_id)
      `)
      results.push('workspace_roles index: OK')

      // 2. Ensure comments table has workspace_id column
      await prisma.$executeRawUnsafe(`
        ALTER TABLE public.comments
        ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE
      `)
      results.push('comments.workspace_id column: OK')

      // 3. Seed default roles for all existing workspaces that don't have them
      const { data: workspaces } = await admin.from('workspaces').select('id')
      if (workspaces) {
        for (const ws of workspaces) {
          const defaultRoles = [
            { key: 'owner', label: 'Dueño', description: 'Acceso total. Ve finanzas, equipo y toda la agencia.', color: '#f59e0b', base_role: 'owner', is_system: true },
            { key: 'admin', label: 'Admin', description: 'Acceso operativo completo. Sin acceso a billing.', color: '#8b5cf6', base_role: 'admin', is_system: true },
            { key: 'trafficker', label: 'Trafficker', description: 'Ve sus clientes, campañas, tareas y KPIs asignados.', color: '#3b82f6', base_role: 'trafficker', is_system: true },
            { key: 'viewer', label: 'Solo lectura', description: 'Solo puede ver reportes y KPIs. Sin edición.', color: '#64748b', base_role: 'viewer', is_system: true },
          ]
          for (const role of defaultRoles) {
            await admin.from('workspace_roles').upsert(
              { workspace_id: ws.id, ...role },
              { onConflict: 'workspace_id,key', ignoreDuplicates: true }
            )
          }
        }
        results.push(`Default roles seeded for ${workspaces.length} workspaces: OK`)
      }

    } finally {
      await prisma.$disconnect()
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Migration error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

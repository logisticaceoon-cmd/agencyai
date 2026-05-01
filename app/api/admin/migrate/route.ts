import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// One-time migration endpoint — protected by CRON_SECRET
// Call: POST /api/admin/migrate {"secret": "..."}
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const cronSecret = process.env.CRON_SECRET || 'ceoon-migrate-2026'
    if (body.secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const results: string[] = []

    const { Client } = await import('pg')

    const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace('https://', '').replace('.supabase.co', '')
    const dbPassword = process.env.DB_PASSWORD || 'agenciaai2026'

    // CONNECTION PRIORITY:
    // 1. process.env.DATABASE_URL — Vercel may have this set to the pooler/direct URL
    // 2. process.env.DIRECT_URL — Vercel sometimes sets both
    // 3. Direct Supabase connection (IPv6, works from Vercel but not local sandbox)
    // 4. Session pooler in all regions as fallback
    const CONNECTION_ATTEMPTS = [
      // Vercel-configured connection strings (highest priority — may work when others don't)
      ...(process.env.DATABASE_URL ? [{ url: process.env.DATABASE_URL, label: 'env-DATABASE_URL' }] : []),
      ...(process.env.DIRECT_URL ? [{ url: process.env.DIRECT_URL, label: 'env-DIRECT_URL' }] : []),
      // Direct connection (IPv6 — works from Vercel serverless, not from local)
      { url: `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`, label: 'direct-ipv6' },
      // Session pooler in all Supabase regions
      ...['us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'ca-central-1', 'sa-east-1']
        .map(r => ({ url: `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${r}.pooler.supabase.com:5432/postgres`, label: `pooler-${r}` })),
    ]

    let client: import('pg').Client | null = null
    let connectedLabel = ''
    const errors: string[] = []

    for (const attempt of CONNECTION_ATTEMPTS) {
      const tryClient = new Client({
        connectionString: attempt.url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      })
      try {
        await tryClient.connect()
        client = tryClient
        connectedLabel = attempt.label
        break
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)).toLowerCase()
        errors.push(`${attempt.label}: ${msg.slice(0, 80)}`)
        // All connection errors are retryable — keep trying all options
        continue
      }
    }

    if (!client) {
      return NextResponse.json({
        error: 'Could not connect to database. None of the connection methods worked.',
        details: errors,
      }, { status: 500 })
    }

    results.push(`Connected via: ${connectedLabel}`)

    try {
      // 1. Create workspace_roles table
      await client.query(`
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

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_workspace_roles_workspace
        ON public.workspace_roles(workspace_id)
      `)
      results.push('workspace_roles index: OK')

      // 2. Create docs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.docs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          content TEXT,
          category TEXT DEFAULT 'general',
          status TEXT DEFAULT 'draft',
          author_id TEXT,
          version INT DEFAULT 1,
          version_notes TEXT,
          tags TEXT[] DEFAULT '{}',
          external_url TEXT,
          client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
          project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `)
      results.push('docs table: OK')

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_docs_workspace ON public.docs(workspace_id)
      `)
      results.push('docs index: OK')

      // 3. Seed default roles for all existing workspaces
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
      await client.end()
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Migration error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

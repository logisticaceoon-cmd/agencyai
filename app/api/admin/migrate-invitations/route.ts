import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST(request: Request) {
  const { secret } = await request.json().catch(() => ({}))
  if (secret !== 'ceoon_migrate_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.workspace_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'trafficker',
        token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        invited_by UUID,
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wi_workspace_id ON public.workspace_invitations(workspace_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wi_token ON public.workspace_invitations(token)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wi_email ON public.workspace_invitations(email)`)
    await pool.end()
    return NextResponse.json({ ok: true, message: 'workspace_invitations table created' })
  } catch (err: unknown) {
    await pool.end().catch(() => {})
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

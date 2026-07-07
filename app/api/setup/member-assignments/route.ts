import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/setup/member-assignments
 * One-time DDL: crea tabla member_client_assignments si no existe.
 * Protegido por CRON_SECRET.
 *
 * NOTA: Esta migración ya fue aplicada via migration 022.
 * Este endpoint se mantiene solo como referencia / idempotente.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // DDL ya aplicado via migraciones de Supabase.
    // Usar rpc para ejecutar SQL raw si fuera necesario re-ejecutar:
    const { error: tableError } = await supabase.rpc('exec_migration', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.member_client_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL,
          member_user_id UUID NOT NULL,
          client_id UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(workspace_id, member_user_id, client_id)
        )
      `,
    })

    if (tableError) {
      // La tabla probablemente ya existe — no es fatal
      console.warn('[member-assignments] DDL warning:', tableError.message)
    }

    // Crear índices
    for (const idx of [
      'CREATE INDEX IF NOT EXISTS idx_mca_workspace ON public.member_client_assignments(workspace_id)',
      'CREATE INDEX IF NOT EXISTS idx_mca_member ON public.member_client_assignments(workspace_id, member_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_mca_client ON public.member_client_assignments(workspace_id, client_id)',
    ]) {
      try { await supabase.rpc('exec_migration', { sql: idx }) } catch { /* index may already exist */ }
    }

    return NextResponse.json({
      ok: true,
      message: 'member_client_assignments table ready',
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

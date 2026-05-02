import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/cron/cleanup-accounts
// Vercel Cron: ejecuta diariamente a las 3 AM UTC
// Borra permanentemente las cuentas desactivadas donde delete_after < now
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  // Verificar que viene de Vercel Cron o de un request autorizado
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const now = new Date()

    // Encontrar todas las organizaciones cuyo período de retención expiró
    const { data: expiredOrgs, error: fetchErr } = await supabase
      .from('organizations')
      .select('id, name, slug, delete_after')
      .eq('status', 'deactivated')
      .lte('delete_after', now.toISOString())

    if (fetchErr) {
      console.error('[cleanup-accounts] Error consultando orgs:', fetchErr.message)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!expiredOrgs || expiredOrgs.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No hay cuentas expiradas para eliminar',
        checkedAt: now.toISOString(),
      })
    }

    const deletedIds: string[] = []
    const errors: string[] = []

    // Tablas a limpiar en orden (de hijos a padres para respetar FK)
    const childTables = [
      'notifications',
      'activity_log',
      'recordings',
      'meetings',
      'kpis',
      'objectives',
      'finances',
      'reports',
      'tasks',
      'projects',
      'clients',
      'invitations',
      'organization_members',
    ]

    for (const org of expiredOrgs) {
      try {
        // Borrar datos relacionados en orden
        for (const table of childTables) {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq('organization_id', org.id)

          if (error && !error.message.includes('does not exist')) {
            console.warn(`[cleanup-accounts] Warning en tabla ${table} para org ${org.id}:`, error.message)
          }
        }

        // Finalmente borrar la organización
        const { error: deleteErr } = await supabase
          .from('organizations')
          .delete()
          .eq('id', org.id)

        if (deleteErr) {
          throw new Error(deleteErr.message)
        }

        deletedIds.push(org.id)
        console.log(`[cleanup-accounts] Organización eliminada: ${org.name} (${org.id}) — deleteAfter: ${org.delete_after}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${org.id} (${org.name}): ${msg}`)
        console.error(`[cleanup-accounts] Error eliminando ${org.name}:`, msg)
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
      checkedAt: now.toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cleanup-accounts] Error general:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

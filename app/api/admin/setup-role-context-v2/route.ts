import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Mismo patrón de conexión que /api/admin/migrate (IPv6 directo funciona desde Vercel)
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { Client } = await import('pg')
    const admin = createAdminClient()

    const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace('https://', '').replace('.supabase.co', '')
    const dbPassword = process.env.DB_PASSWORD
    if (!dbPassword) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const CONNECTION_ATTEMPTS = [
      ...(process.env.DATABASE_URL ? [{ url: process.env.DATABASE_URL, label: 'env-DATABASE_URL' }] : []),
      ...(process.env.DIRECT_URL ? [{ url: process.env.DIRECT_URL, label: 'env-DIRECT_URL' }] : []),
      { url: `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`, label: 'direct-ipv6' },
      ...['us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'ca-central-1', 'sa-east-1']
        .map(r => ({ url: `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${r}.pooler.supabase.com:5432/postgres`, label: `pooler-${r}` })),
    ]

    let client: import('pg').Client | null = null
    let connectedLabel = ''
    const errors: string[] = []

    for (const attempt of CONNECTION_ATTEMPTS) {
      const tryClient = new Client({
        connectionString: attempt.url,
        ssl: { rejectUnauthorized: true },
        connectionTimeoutMillis: 8000,
      })
      try {
        await tryClient.connect()
        client = tryClient
        connectedLabel = attempt.label
        break
      } catch (e) {
        errors.push(`${attempt.label}: ${(e instanceof Error ? e.message : String(e)).slice(0, 60)}`)
        continue
      }
    }

    if (!client) {
      return NextResponse.json({ error: 'No DB connection', details: errors }, { status: 500 })
    }

    const results: Record<string, string> = { connected_via: connectedLabel }

    // 1. Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_ai_context (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        allowed_topics JSONB NOT NULL DEFAULT '[]',
        restricted_topics JSONB NOT NULL DEFAULT '[]',
        system_prompt_addition TEXT NOT NULL DEFAULT '',
        can_create_tasks BOOLEAN NOT NULL DEFAULT false,
        can_view_finances BOOLEAN NOT NULL DEFAULT false,
        can_view_team BOOLEAN NOT NULL DEFAULT false,
        can_view_all_clients BOOLEAN NOT NULL DEFAULT false,
        can_view_performance BOOLEAN NOT NULL DEFAULT false,
        can_view_reports BOOLEAN NOT NULL DEFAULT false,
        tone_instruction TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    results.create_table = 'OK'

    await client.query(`CREATE INDEX IF NOT EXISTS idx_role_ai_context_role ON role_ai_context(role)`)
    results.create_index = 'OK'

    await client.query(`
      CREATE OR REPLACE FUNCTION update_role_ai_context_ts()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END;
      $$ LANGUAGE plpgsql
    `)
    await client.query(`DROP TRIGGER IF EXISTS trg_role_ai_updated ON role_ai_context`)
    await client.query(`
      CREATE TRIGGER trg_role_ai_updated
        BEFORE UPDATE ON role_ai_context
        FOR EACH ROW EXECUTE FUNCTION update_role_ai_context_ts()
    `)
    results.create_trigger = 'OK'

    try { await client.query(`NOTIFY pgrst, 'reload schema'`) } catch { /* no fatal */ }

    await client.end()

    // 2. Seed roles via Supabase admin client (REST — schema cache refreshed)
    // Small delay to let PostgREST pick up the new table
    await new Promise(r => setTimeout(r, 2000))

    const roles = [
      {
        role: 'owner',
        display_name: 'CEO / Dueño',
        allowed_topics: ['estrategia','finanzas','equipo','clientes','campañas','KPIs','reportes','tareas','proyectos','crecimiento','facturación','contratos','rendimiento','nómina','comisiones','nuevos clientes','SOPs','herramientas','objetivos','decisiones','automatizaciones'],
        restricted_topics: [] as string[],
        system_prompt_addition: `Estás hablando con el CEO y dueño de la agencia.\n- Sos su socio de operaciones, no su asistente. Tenés criterio propio.\n- Lo desafiás cuando se dispersa en tareas de bajo valor.\n- Priorizás siempre: 1) impacto en ingresos, 2) crecimiento, 3) urgencia real.\n- Máximo 3 tareas críticas por día.\n- Es directo — no quiere listas largas ni texto de relleno.\n- Acceso completo: finanzas, equipo, todos los clientes, rendimiento, reportes, nóminas.\n- Cuando algo está mal lo decís. Cuando está bien lo reconocés en una línea y seguís.`,
        can_create_tasks: true, can_view_finances: true, can_view_team: true, can_view_all_clients: true, can_view_performance: true, can_view_reports: true,
        tone_instruction: 'Directo, conciso, como socio senior. Sin suavizar mensajes. Sin relleno. Voz de consultor de alto nivel.',
      },
      {
        role: 'admin',
        display_name: 'Administrador',
        allowed_topics: ['clientes','proyectos','tareas','equipo','reportes','KPIs','rendimiento','campañas','estado de trabajo','minutas','seguimiento','objetivos'],
        restricted_topics: ['nómina','salarios','pagos al equipo','facturación Stripe','planes de suscripción','datos financieros globales','contratos de clientes'],
        system_prompt_addition: `Estás hablando con un administrador del workspace.\n- Acceso operativo completo: clientes, proyectos, tareas, equipo, reportes, KPIs.\n- NO hablar de: nóminas internas, salarios del equipo, facturación de la plataforma ni contratos.\n- Puede crear y gestionar tareas, ver rendimiento del equipo y clientes.\n- Respuestas prácticas, orientadas a ejecución.`,
        can_create_tasks: true, can_view_finances: false, can_view_team: true, can_view_all_clients: true, can_view_performance: true, can_view_reports: true,
        tone_instruction: 'Profesional, colaborativo, orientado a ejecución. Claro y directo.',
      },
      {
        role: 'trafficker',
        display_name: 'Trafficker / Estratega Digital',
        allowed_topics: ['tareas asignadas','campañas activas','métricas de campañas','Meta Ads','TikTok Ads','optimización de anuncios','públicos objetivos','creativos','ROAS','CPM','CTR','conversiones','presupuesto de campaña','clientes asignados','reportes de clientes','briefing del día','cierre del día','estrategia de campaña','tests A/B'],
        restricted_topics: ['finanzas de la agencia','ingresos totales de la agencia','nóminas','salarios','contratos','clientes no asignados','estrategia de adquisición de clientes','gestión del equipo','facturación','tareas de otros usuarios'],
        system_prompt_addition: `Estás hablando con un trafficker del equipo.\n- SOLO hablar de: tareas asignadas a él/ella, campañas de sus clientes asignados, optimización de Meta Ads/TikTok Ads, métricas de performance, reportes de sus clientes, organización del día.\n- NO hablar de: finanzas globales de la agencia, salarios, nóminas, contratos, clientes que NO le fueron asignados, tareas de otros miembros del equipo.\n- Si pregunta sobre finanzas de la agencia: "No tengo acceso a esa información, consultá con el owner."\n- Si pregunta sobre clientes que no son suyos: "No tengo acceso a esa información."\n- Enfocado en ejecución de campañas y resultados para sus clientes.`,
        can_create_tasks: true, can_view_finances: false, can_view_team: false, can_view_all_clients: false, can_view_performance: true, can_view_reports: true,
        tone_instruction: 'Directo, práctico, enfocado en campañas. Sin rodeos. Orientado a métricas y resultados.',
      },
      {
        role: 'viewer',
        display_name: 'Observador / Solo Lectura',
        allowed_topics: ['reportes compartidos','estado de proyectos','KPIs visibles','métricas generales','resumen de avance'],
        restricted_topics: ['finanzas','nómina','salarios','equipo interno','tareas','clientes','campañas','estrategia','contratos','creación de contenido'],
        system_prompt_addition: `Estás hablando con un usuario con rol de solo lectura (viewer).\n- SOLO puede consultar: reportes que le fueron compartidos, estado general de proyectos, métricas visibles.\n- NO puede crear ni modificar nada en el sistema.\n- NO hablar de: finanzas, nóminas, equipo interno, clientes, campañas activas, estrategia.\n- Si pide hacer algo que requiere permisos: "Para eso necesitás permisos adicionales. Contactá al administrador del workspace."`,
        can_create_tasks: false, can_view_finances: false, can_view_team: false, can_view_all_clients: false, can_view_performance: false, can_view_reports: true,
        tone_instruction: 'Informativo, claro, sin jerga técnica. Solo describir lo que puede ver, no lo que puede hacer.',
      },
    ]

    for (const r of roles) {
      const { error } = await admin
        .from('role_ai_context')
        .upsert(r, { onConflict: 'role' })
      results[`seed_${r.role}`] = error ? `ERROR: ${error.message}` : 'OK'
    }

    const allOk = Object.entries(results)
      .filter(([k]) => !['connected_via'].includes(k))
      .every(([, v]) => v === 'OK')

    return NextResponse.json({
      success: allOk,
      table: 'role_ai_context',
      results,
      message: allOk
        ? '✅ role_ai_context creada y poblada (4 roles: owner, admin, trafficker, viewer)'
        : '⚠️ Algunos pasos fallaron — ver results',
    })
  } catch (err: unknown) {
    console.error('Setup failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}

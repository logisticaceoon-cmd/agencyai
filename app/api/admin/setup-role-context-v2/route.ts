import { NextResponse } from 'next/server'
import { Pool } from 'pg'

// Endpoint de setup v2 — usa pg directamente (sin Prisma/pooler)
// Protegido con CRON_SECRET. Idempotente.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })

  const client = await pool.connect()

  try {
    // ── 1. Crear tabla ────────────────────────────────────────────────────────
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
      );
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_role_ai_context_role ON role_ai_context(role);`)

    await client.query(`
      CREATE OR REPLACE FUNCTION update_role_ai_context_ts()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `)
    await client.query(`DROP TRIGGER IF EXISTS trg_role_ai_updated ON role_ai_context;`)
    await client.query(`
      CREATE TRIGGER trg_role_ai_updated
        BEFORE UPDATE ON role_ai_context
        FOR EACH ROW EXECUTE FUNCTION update_role_ai_context_ts();
    `)

    // ── 2. Seed — 4 roles ─────────────────────────────────────────────────────
    const roles = [
      {
        role: 'owner',
        display_name: 'CEO / Dueño',
        allowed_topics: JSON.stringify([
          'estrategia','finanzas','equipo','clientes','campañas','KPIs',
          'reportes','tareas','proyectos','crecimiento','facturación',
          'contratos','rendimiento','nómina','comisiones','nuevos clientes',
          'SOPs','herramientas','objetivos','decisiones','automatizaciones',
        ]),
        restricted_topics: JSON.stringify([]),
        system_prompt_addition: `Estás hablando con el CEO y dueño de la agencia.
- Sos su socio de operaciones, no su asistente. Tenés criterio propio.
- Lo desafiás cuando se dispersa en tareas de bajo valor.
- Priorizás siempre: 1) impacto en ingresos, 2) crecimiento, 3) urgencia real.
- Máximo 3 tareas críticas por día.
- Es directo — no quiere listas largas ni texto de relleno.
- Acceso completo: finanzas, equipo, todos los clientes, rendimiento, reportes, nóminas.
- Cuando algo está mal lo decís. Cuando está bien lo reconocés en una línea y seguís.`,
        can_create_tasks: true,
        can_view_finances: true,
        can_view_team: true,
        can_view_all_clients: true,
        can_view_performance: true,
        can_view_reports: true,
        tone_instruction: 'Directo, conciso, como socio senior. Sin suavizar mensajes. Sin relleno. Voz de consultor de alto nivel.',
      },
      {
        role: 'admin',
        display_name: 'Administrador',
        allowed_topics: JSON.stringify([
          'clientes','proyectos','tareas','equipo','reportes','KPIs',
          'rendimiento','campañas','estado de trabajo','minutas','seguimiento','objetivos',
        ]),
        restricted_topics: JSON.stringify([
          'nómina','salarios','pagos al equipo','facturación Stripe',
          'planes de suscripción','datos financieros globales','contratos de clientes',
        ]),
        system_prompt_addition: `Estás hablando con un administrador del workspace.
- Acceso operativo completo: clientes, proyectos, tareas, equipo, reportes, KPIs.
- NO hablar de: nóminas internas, salarios del equipo, facturación de la plataforma ni contratos.
- Puede crear y gestionar tareas, ver rendimiento del equipo y clientes.
- Respuestas prácticas, orientadas a ejecución.`,
        can_create_tasks: true,
        can_view_finances: false,
        can_view_team: true,
        can_view_all_clients: true,
        can_view_performance: true,
        can_view_reports: true,
        tone_instruction: 'Profesional, colaborativo, orientado a ejecución. Claro y directo.',
      },
      {
        role: 'trafficker',
        display_name: 'Trafficker / Estratega Digital',
        allowed_topics: JSON.stringify([
          'tareas asignadas','campañas activas','métricas de campañas','Meta Ads',
          'TikTok Ads','optimización de anuncios','públicos objetivos','creativos',
          'ROAS','CPM','CTR','conversiones','presupuesto de campaña',
          'clientes asignados','reportes de clientes','briefing del día',
          'cierre del día','estrategia de campaña','tests A/B',
        ]),
        restricted_topics: JSON.stringify([
          'finanzas de la agencia','ingresos totales de la agencia','nóminas',
          'salarios','contratos','clientes no asignados',
          'estrategia de adquisición de clientes','gestión del equipo',
          'facturación','tareas de otros usuarios',
        ]),
        system_prompt_addition: `Estás hablando con un trafficker del equipo.
- SOLO hablar de: tareas asignadas a él/ella, campañas de sus clientes asignados, optimización de Meta Ads/TikTok Ads, métricas de performance, reportes de sus clientes, organización del día.
- NO hablar de: finanzas globales de la agencia, salarios, nóminas, contratos, clientes que NO le fueron asignados, tareas de otros miembros del equipo.
- Si pregunta sobre finanzas de la agencia: "No tengo acceso a esa información, consultá con el owner."
- Si pregunta sobre clientes que no son suyos: "No tengo acceso a esa información."
- Enfocado en ejecución de campañas y resultados para sus clientes.`,
        can_create_tasks: true,
        can_view_finances: false,
        can_view_team: false,
        can_view_all_clients: false,
        can_view_performance: true,
        can_view_reports: true,
        tone_instruction: 'Directo, práctico, enfocado en campañas. Sin rodeos. Orientado a métricas y resultados.',
      },
      {
        role: 'viewer',
        display_name: 'Observador / Solo Lectura',
        allowed_topics: JSON.stringify([
          'reportes compartidos','estado de proyectos','KPIs visibles',
          'métricas generales','resumen de avance',
        ]),
        restricted_topics: JSON.stringify([
          'finanzas','nómina','salarios','equipo interno','tareas',
          'clientes','campañas','estrategia','contratos','creación de contenido',
        ]),
        system_prompt_addition: `Estás hablando con un usuario con rol de solo lectura (viewer).
- SOLO puede consultar: reportes que le fueron compartidos, estado general de proyectos, métricas visibles.
- NO puede crear ni modificar nada en el sistema.
- NO hablar de: finanzas, nóminas, equipo interno, clientes, campañas activas, estrategia.
- Si pide hacer algo que requiere permisos: "Para eso necesitás permisos adicionales. Contactá al administrador del workspace."`,
        can_create_tasks: false,
        can_view_finances: false,
        can_view_team: false,
        can_view_all_clients: false,
        can_view_performance: false,
        can_view_reports: true,
        tone_instruction: 'Informativo, claro, sin jerga técnica. Solo describir lo que puede ver, no lo que puede hacer.',
      },
    ]

    const results: Record<string, string> = {}

    for (const r of roles) {
      try {
        await client.query(`
          INSERT INTO role_ai_context (
            role, display_name, allowed_topics, restricted_topics,
            system_prompt_addition, can_create_tasks, can_view_finances,
            can_view_team, can_view_all_clients, can_view_performance,
            can_view_reports, tone_instruction
          ) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (role) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            allowed_topics = EXCLUDED.allowed_topics,
            restricted_topics = EXCLUDED.restricted_topics,
            system_prompt_addition = EXCLUDED.system_prompt_addition,
            can_create_tasks = EXCLUDED.can_create_tasks,
            can_view_finances = EXCLUDED.can_view_finances,
            can_view_team = EXCLUDED.can_view_team,
            can_view_all_clients = EXCLUDED.can_view_all_clients,
            can_view_performance = EXCLUDED.can_view_performance,
            can_view_reports = EXCLUDED.can_view_reports,
            tone_instruction = EXCLUDED.tone_instruction,
            updated_at = now()
        `, [
          r.role, r.display_name, r.allowed_topics, r.restricted_topics,
          r.system_prompt_addition, r.can_create_tasks, r.can_view_finances,
          r.can_view_team, r.can_view_all_clients, r.can_view_performance,
          r.can_view_reports, r.tone_instruction,
        ])
        results[r.role] = 'OK'
      } catch (err: any) {
        results[r.role] = `ERROR: ${err?.message}`
      }
    }

    // Recargar schema cache PostgREST
    try { await client.query(`NOTIFY pgrst, 'reload schema'`) } catch { /* no fatal */ }

    const allOk = Object.values(results).every(v => v === 'OK')

    return NextResponse.json({
      success: allOk,
      table: 'role_ai_context',
      roles_seeded: Object.keys(results),
      results,
      message: allOk
        ? '✅ role_ai_context creada y poblada para 4 roles (owner, admin, trafficker, viewer)'
        : '⚠️ Algunos roles fallaron — ver results para detalle',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
    await pool.end()
  }
}

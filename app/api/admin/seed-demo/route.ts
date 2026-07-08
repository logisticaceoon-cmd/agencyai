import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST() {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    // Verificar que no haya clientes (prevenir doble seed)
    const { count: clientCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)

    if (clientCount && clientCount > 0) {
      return NextResponse.json(
        { error: 'El workspace ya tiene clientes. No se pueden cargar datos de ejemplo.' },
        { status: 400 }
      )
    }

    // ── Crear 5 Clientes ────────────────────────────────────────────
    const clientsData = [
      { name: 'TechVision Labs', industry: 'Tecnologia', status: 'active', monthlyFee: 3000, email: 'contacto@techvision.io', website: 'https://techvision.io', notes: 'Startup de IA enfocada en automatizacion empresarial' },
      { name: 'Eco Organics', industry: 'Alimentos', status: 'active', monthlyFee: 2500, email: 'hola@ecoorganics.com', website: 'https://ecoorganics.com', notes: 'Marca de productos organicos certificados' },
      { name: 'FitPro Gym', industry: 'Fitness', status: 'active', monthlyFee: 1800, email: 'admin@fitprogym.com', website: 'https://fitprogym.com', notes: 'Cadena de gimnasios con 5 sucursales' },
      { name: 'Luxe Properties', industry: 'Bienes Raices', status: 'active', monthlyFee: 4000, email: 'ventas@luxeproperties.mx', website: 'https://luxeproperties.mx', notes: 'Desarrollo inmobiliario premium' },
      { name: 'Artisan Coffee Co', industry: 'Alimentos y Bebidas', status: 'active', monthlyFee: 1500, email: 'info@artisancoffee.com', website: 'https://artisancoffee.com', notes: 'Cafe de especialidad con tienda online' },
    ]

    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .insert(clientsData.map(c => ({
        workspace_id: workspaceId,
        name: c.name,
        industry: c.industry,
        status: c.status,
        monthlyFee: c.monthlyFee,
        email: c.email,
        website: c.website,
        notes: c.notes,
        currency: 'USD',
      })))
      .select('id, name')

    if (clientsErr || !clients) {
      console.error('Error seeding clients:', clientsErr)
      return NextResponse.json({ error: 'Error al crear clientes de ejemplo' }, { status: 500 })
    }

    const clientMap: Record<string, string> = {}
    clients.forEach(c => { clientMap[c.name] = c.id })

    // ── Crear 8 Proyectos ───────────────────────────────────────────
    const now = new Date()
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString().split('T')[0]
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().split('T')[0]

    const projectsData = [
      { name: 'Rediseno Web', clientName: 'TechVision Labs', status: 'active', budget: 5000, progress: 60, startDate: daysAgo(45), endDate: daysFromNow(30), description: 'Rediseno completo del sitio web con nuevo stack tecnologico' },
      { name: 'Campana Meta Ads Q3', clientName: 'TechVision Labs', status: 'active', budget: 3000, progress: 25, startDate: daysAgo(15), endDate: daysFromNow(75), description: 'Campana de adquisicion de leads via Meta Ads' },
      { name: 'Branding Completo', clientName: 'Eco Organics', status: 'active', budget: 4500, progress: 80, startDate: daysAgo(60), endDate: daysFromNow(10), description: 'Identidad visual completa: logo, paleta, tipografia, manual de marca' },
      { name: 'SEO y Contenido', clientName: 'Eco Organics', status: 'active', budget: 2000, progress: 40, startDate: daysAgo(30), endDate: daysFromNow(60), description: 'Estrategia de posicionamiento organico y plan de contenidos' },
      { name: 'Lanzamiento App', clientName: 'FitPro Gym', status: 'active', budget: 8000, progress: 30, startDate: daysAgo(20), endDate: daysFromNow(90), description: 'App movil para reserva de clases y seguimiento de progreso' },
      { name: 'Social Media Management', clientName: 'FitPro Gym', status: 'active', budget: 1500, progress: 50, startDate: daysAgo(30), endDate: daysFromNow(60), description: 'Gestion de redes sociales: IG, TikTok, Facebook' },
      { name: 'Portal Inmobiliario', clientName: 'Luxe Properties', status: 'active', budget: 12000, progress: 15, startDate: daysAgo(10), endDate: daysFromNow(120), description: 'Plataforma web para listado y venta de propiedades premium' },
      { name: 'Identidad de Marca', clientName: 'Artisan Coffee Co', status: 'active', budget: 3000, progress: 45, startDate: daysAgo(25), endDate: daysFromNow(35), description: 'Branding completo para linea de cafe de especialidad' },
    ]

    const { data: projects, error: projectsErr } = await supabase
      .from('projects')
      .insert(projectsData.map(p => ({
        workspace_id: workspaceId,
        name: p.name,
        clientId: clientMap[p.clientName],
        status: p.status,
        budget: p.budget,
        progress: p.progress,
        startDate: p.startDate,
        endDate: p.endDate,
        description: p.description,
        owner_id: userId,
      })))
      .select('id, name')

    if (projectsErr || !projects) {
      console.error('Error seeding projects:', projectsErr)
      return NextResponse.json({ error: 'Error al crear proyectos de ejemplo' }, { status: 500 })
    }

    const projectMap: Record<string, string> = {}
    projects.forEach(p => { projectMap[p.name] = p.id })

    // ── Crear 20 Tareas ─────────────────────────────────────────────
    const tasksData = [
      // Todo (5)
      { title: 'Wireframes pagina principal', projectName: 'Rediseno Web', status: 'pending', priority: 'high', deadline: daysFromNow(5) },
      { title: 'Configurar pixel de Meta', projectName: 'Campana Meta Ads Q3', status: 'pending', priority: 'urgent', deadline: daysFromNow(2) },
      { title: 'Revisar tipografias seleccionadas', projectName: 'Identidad de Marca', status: 'pending', priority: 'medium', deadline: daysFromNow(7) },
      { title: 'Definir arquitectura de informacion', projectName: 'Portal Inmobiliario', status: 'pending', priority: 'high', deadline: daysFromNow(10) },
      { title: 'Crear calendario editorial', projectName: 'SEO y Contenido', status: 'pending', priority: 'medium', deadline: daysFromNow(8) },
      // In progress (6)
      { title: 'Desarrollo frontend home', projectName: 'Rediseno Web', status: 'in_progress', priority: 'high', deadline: daysFromNow(15) },
      { title: 'Diseno de logotipo final', projectName: 'Branding Completo', status: 'in_progress', priority: 'urgent', deadline: daysFromNow(3) },
      { title: 'Prototipo UX app movil', projectName: 'Lanzamiento App', status: 'in_progress', priority: 'high', deadline: daysFromNow(12) },
      { title: 'Contenido redes semana 1', projectName: 'Social Media Management', status: 'in_progress', priority: 'medium', deadline: daysFromNow(4) },
      { title: 'Keyword research', projectName: 'SEO y Contenido', status: 'in_progress', priority: 'medium', deadline: daysFromNow(6) },
      { title: 'Maquetacion landing propiedades', projectName: 'Portal Inmobiliario', status: 'in_progress', priority: 'high', deadline: daysFromNow(20) },
      // Completed (7)
      { title: 'Auditoria SEO inicial', projectName: 'SEO y Contenido', status: 'completed', priority: 'high', deadline: daysAgo(5) },
      { title: 'Paleta de colores aprobada', projectName: 'Branding Completo', status: 'completed', priority: 'medium', deadline: daysAgo(10) },
      { title: 'Benchmark competencia', projectName: 'Rediseno Web', status: 'completed', priority: 'medium', deadline: daysAgo(15) },
      { title: 'Brief creativo aprobado', projectName: 'Identidad de Marca', status: 'completed', priority: 'high', deadline: daysAgo(8) },
      { title: 'Setup cuenta publicitaria', projectName: 'Campana Meta Ads Q3', status: 'completed', priority: 'high', deadline: daysAgo(3) },
      { title: 'Onboarding cliente completado', projectName: 'Portal Inmobiliario', status: 'completed', priority: 'low', deadline: daysAgo(7) },
      { title: 'Definir user stories app', projectName: 'Lanzamiento App', status: 'completed', priority: 'high', deadline: daysAgo(12) },
      // Extra in_progress (2 more to reach 20)
      { title: 'Edicion fotos producto', projectName: 'Identidad de Marca', status: 'in_progress', priority: 'low', deadline: daysFromNow(14) },
      { title: 'Configurar analytics GA4', projectName: 'Rediseno Web', status: 'pending', priority: 'medium', deadline: daysFromNow(18) },
    ]

    const { data: tasks, error: tasksErr } = await supabase
      .from('tasks')
      .insert(tasksData.map(t => ({
        workspace_id: workspaceId,
        title: t.title,
        projectId: projectMap[t.projectName],
        clientId: clientMap[projectsData.find(p => p.name === t.projectName)?.clientName || ''],
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
        assignedTo: [userId],
        completed_at: t.status === 'completed' ? new Date().toISOString() : null,
      })))
      .select('id')

    if (tasksErr) {
      console.error('Error seeding tasks:', tasksErr)
    }

    // ── Crear Time Entries (~60 entradas, 3 meses) ──────────────────
    const timeEntries: Record<string, unknown>[] = []
    const descriptions = [
      'Reunion de kickoff', 'Diseno de mockups', 'Desarrollo frontend', 'Revision de copy',
      'Analisis de metricas', 'Call con cliente', 'Ajustes de diseno', 'Investigacion de mercado',
      'Optimizacion SEO', 'Creacion de contenido', 'Testing QA', 'Configuracion de campana',
      'Edicion de video', 'Revision de entregables', 'Planificacion sprint',
    ]

    const projectNames = Object.keys(projectMap)
    for (let i = 0; i < 60; i++) {
      const daysBack = Math.floor(Math.random() * 90)
      const startTime = new Date(now.getTime() - daysBack * 86400000)
      startTime.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60))
      const duration = 30 + Math.floor(Math.random() * 210) // 30min to 4h
      const endTime = new Date(startTime.getTime() + duration * 60000)
      const projName = projectNames[i % projectNames.length]
      const projClient = projectsData.find(p => p.name === projName)?.clientName || ''

      timeEntries.push({
        workspace_id: workspaceId,
        user_id: userId,
        project_id: projectMap[projName],
        client_id: clientMap[projClient],
        description: descriptions[i % descriptions.length],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: duration,
        billable: Math.random() > 0.2, // 80% billable
        status: 'stopped',
      })
    }

    const { error: timeErr } = await supabase.from('time_entries').insert(timeEntries)
    if (timeErr) console.error('Error seeding time entries:', timeErr)

    // ── Crear 6 Facturas ────────────────────────────────────────────
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15)

    const invoicesData = [
      // 2 paid (last month)
      {
        client_id: clientMap['TechVision Labs'], status: 'paid', number: 'DEMO-001',
        subtotal: 3000, tax_rate: 16, tax_amount: 480, total: 3480, currency: 'USD',
        issue_date: new Date(lastMonth.getTime() - 15 * 86400000).toISOString().split('T')[0],
        due_date: new Date(lastMonth.getTime() + 15 * 86400000).toISOString().split('T')[0],
        paid_at: new Date(lastMonth.getTime() + 10 * 86400000).toISOString(),
        items: JSON.stringify([{ description: 'Servicio mensual - TechVision Labs', quantity: 1, unit_price: 3000 }]),
      },
      {
        client_id: clientMap['Eco Organics'], status: 'paid', number: 'DEMO-002',
        subtotal: 2500, tax_rate: 16, tax_amount: 400, total: 2900, currency: 'USD',
        issue_date: new Date(lastMonth.getTime() - 15 * 86400000).toISOString().split('T')[0],
        due_date: new Date(lastMonth.getTime() + 15 * 86400000).toISOString().split('T')[0],
        paid_at: new Date(lastMonth.getTime() + 12 * 86400000).toISOString(),
        items: JSON.stringify([{ description: 'Branding + diseno mensual', quantity: 1, unit_price: 2500 }]),
      },
      // 2 sent (this month)
      {
        client_id: clientMap['FitPro Gym'], status: 'sent', number: 'DEMO-003',
        subtotal: 1800, tax_rate: 16, tax_amount: 288, total: 2088, currency: 'USD',
        issue_date: thisMonth.toISOString().split('T')[0],
        due_date: daysFromNow(15),
        items: JSON.stringify([{ description: 'Social media + App desarrollo', quantity: 1, unit_price: 1800 }]),
      },
      {
        client_id: clientMap['Artisan Coffee Co'], status: 'sent', number: 'DEMO-004',
        subtotal: 1500, tax_rate: 16, tax_amount: 240, total: 1740, currency: 'USD',
        issue_date: thisMonth.toISOString().split('T')[0],
        due_date: daysFromNow(20),
        items: JSON.stringify([{ description: 'Identidad de marca - fase 1', quantity: 1, unit_price: 1500 }]),
      },
      // 1 draft
      {
        client_id: clientMap['Luxe Properties'], status: 'draft', number: 'DEMO-005',
        subtotal: 4000, tax_rate: 16, tax_amount: 640, total: 4640, currency: 'USD',
        issue_date: daysAgo(0),
        due_date: daysFromNow(30),
        items: JSON.stringify([{ description: 'Portal inmobiliario - anticipo', quantity: 1, unit_price: 4000 }]),
      },
      // 1 overdue
      {
        client_id: clientMap['TechVision Labs'], status: 'overdue', number: 'DEMO-006',
        subtotal: 5000, tax_rate: 16, tax_amount: 800, total: 5800, currency: 'USD',
        issue_date: daysAgo(45),
        due_date: daysAgo(15),
        items: JSON.stringify([{ description: 'Rediseno web - milestone 1', quantity: 1, unit_price: 5000 }]),
      },
    ]

    const { error: invoicesErr } = await supabase
      .from('invoices')
      .insert(invoicesData.map(inv => ({ workspace_id: workspaceId, ...inv })))

    if (invoicesErr) console.error('Error seeding invoices:', invoicesErr)

    // ── Ad Spend Records ────────────────────────────────────────────
    const adSpendData: Record<string, unknown>[] = []
    const adClients = ['TechVision Labs', 'Eco Organics', 'FitPro Gym']
    const platforms = ['meta', 'google']

    for (const clientName of adClients) {
      for (const platform of platforms) {
        for (let m = 0; m < 3; m++) {
          const periodStart = new Date(now.getFullYear(), now.getMonth() - m, 1)
          const periodEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0)
          const amount = 500 + Math.floor(Math.random() * 2000)
          const impressions = 10000 + Math.floor(Math.random() * 90000)
          const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.04))
          const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.08))

          adSpendData.push({
            workspace_id: workspaceId,
            client_id: clientMap[clientName],
            platform,
            campaign_name: `${platform === 'meta' ? 'Meta' : 'Google'} - ${clientName} - ${periodStart.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`,
            amount,
            currency: 'USD',
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            impressions,
            clicks,
            conversions,
            cpa: conversions > 0 ? Math.round(amount / conversions * 100) / 100 : null,
            ctr: Math.round(clicks / impressions * 10000) / 100,
            roas: Math.round((1.5 + Math.random() * 3.5) * 100) / 100,
            created_by: userId,
          })
        }
      }
    }

    const { error: adErr } = await supabase.from('ad_spend_records').insert(adSpendData)
    if (adErr) console.error('Error seeding ad spend:', adErr)

    // ── KPIs de ejemplo ─────────────────────────────────────────────
    const kpisData = [
      { name: 'Trafico Web', description: 'Visitas mensuales al sitio web', unit: 'visitas', target_value: 50000, current_value: 32000, category: 'marketing', client_id: clientMap['TechVision Labs'], color: '#3b82f6' },
      { name: 'Tasa de Conversion', description: 'Porcentaje de leads convertidos', unit: '%', target_value: 5, current_value: 3.2, category: 'ventas', client_id: clientMap['TechVision Labs'], color: '#10b981' },
      { name: 'Seguidores Instagram', description: 'Seguidores totales en Instagram', unit: 'seguidores', target_value: 25000, current_value: 18500, category: 'social', client_id: clientMap['Eco Organics'], color: '#8b5cf6' },
      { name: 'Engagement Rate', description: 'Tasa de interaccion en redes', unit: '%', target_value: 4, current_value: 3.8, category: 'social', client_id: clientMap['Eco Organics'], color: '#f59e0b' },
    ]

    const { data: kpis, error: kpisErr } = await supabase
      .from('kpis')
      .insert(kpisData.map(k => ({ workspace_id: workspaceId, ...k, frequency: 'monthly' })))
      .select('id, name')

    if (kpisErr) console.error('Error seeding kpis:', kpisErr)

    // ── Reportes de ejemplo ─────────────────────────────────────────
    const reportsData = [
      {
        title: 'Reporte Mensual - TechVision Labs - Junio',
        clientId: clientMap['TechVision Labs'],
        reportType: 'monthly',
        status: 'validated',
        description: 'Resumen de actividades, metricas y resultados del mes de junio.',
        submittedById: userId,
      },
      {
        title: 'Reporte Mensual - Eco Organics - Junio',
        clientId: clientMap['Eco Organics'],
        reportType: 'monthly',
        status: 'draft',
        description: 'Borrador del reporte mensual con metricas de branding y SEO.',
        submittedById: userId,
      },
    ]

    const { error: reportsErr } = await supabase
      .from('reports')
      .insert(reportsData.map(r => ({ workspace_id: workspaceId, ...r })))

    if (reportsErr) console.error('Error seeding reports:', reportsErr)

    // ── Comunicaciones (client_interactions) ─────────────────────────
    const commsData = [
      { client_id: clientMap['TechVision Labs'], type: 'call', summary: 'Revision de avances del rediseno web. Cliente satisfecho con mockups.', outcome: 'positive', date: daysAgo(2), duration_minutes: 30 },
      { client_id: clientMap['Eco Organics'], type: 'email', summary: 'Envio de propuesta de paleta de colores y tipografias alternativas.', outcome: 'neutral', date: daysAgo(5), duration_minutes: null },
      { client_id: clientMap['FitPro Gym'], type: 'meeting', summary: 'Kickoff del proyecto de app movil. Definicion de alcance y timeline.', outcome: 'positive', date: daysAgo(8), duration_minutes: 60 },
      { client_id: clientMap['Luxe Properties'], type: 'whatsapp', summary: 'Cliente pregunta por avances del portal. Se envia preview del wireframe.', outcome: 'neutral', date: daysAgo(1), duration_minutes: null },
      { client_id: clientMap['Artisan Coffee Co'], type: 'call', summary: 'Feedback sobre logo: solicitan ajuste en tonalidad de colores.', outcome: 'neutral', date: daysAgo(3), duration_minutes: 20 },
    ]

    const { error: commsErr } = await supabase
      .from('client_interactions')
      .insert(commsData.map(c => ({
        workspace_id: workspaceId,
        user_id: userId,
        ...c,
      })))

    if (commsErr) console.error('Error seeding communications:', commsErr)

    // ── Marcar workspace con datos de ejemplo ───────────────────────
    await supabase
      .from('workspaces')
      .update({ has_sample_data: true })
      .eq('id', workspaceId)

    const summary = {
      clients: clients?.length || 0,
      projects: projects?.length || 0,
      tasks: tasks?.length || 0,
      timeEntries: timeEntries.length,
      invoices: invoicesData.length,
      adSpend: adSpendData.length,
      kpis: kpis?.length || 0,
      reports: reportsData.length,
      communications: commsData.length,
    }

    return NextResponse.json({ success: true, summary })
  } catch (err) {
    console.error('Error in POST /api/admin/seed-demo:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

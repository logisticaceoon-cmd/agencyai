import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// NOTE: Run this seed AFTER running `prisma db push` or migrations.
// Users must exist in Supabase Auth first (or use the Supabase admin panel to create them).
// Credentials for all demo users: AgencyAI2026!

async function main() {
  console.log('🌱 Seeding AgencyAI multi-tenant demo data...')

  // ─── DEMO ORGANIZATION ────────────────────────────────────────────────────────

  const ceo = await prisma.user.upsert({
    where: { email: 'ceo@agencia.com' },
    update: {},
    create: {
      email: 'ceo@agencia.com',
      fullName: 'Rafael Demo',
      role: 'CEO',
      department: 'Dirección',
    },
  })

  const maria = await prisma.user.upsert({
    where: { email: 'maria@agencia.com' },
    update: {},
    create: { email: 'maria@agencia.com', fullName: 'María García', role: 'Team', department: 'Meta Ads' },
  })
  const ana = await prisma.user.upsert({
    where: { email: 'designer@agencia.com' },
    update: {},
    create: { email: 'designer@agencia.com', fullName: 'Ana López', role: 'Team', department: 'Diseño' },
  })
  const carlos = await prisma.user.upsert({
    where: { email: 'copy@agencia.com' },
    update: {},
    create: { email: 'copy@agencia.com', fullName: 'Carlos Ruiz', role: 'Team', department: 'Contenido' },
  })
  const laura = await prisma.user.upsert({
    where: { email: 'pm@agencia.com' },
    update: {},
    create: { email: 'pm@agencia.com', fullName: 'Laura Torres', role: 'Manager', department: 'Proyectos' },
  })

  const teamMembers = [maria, ana, carlos, laura]
  console.log('✅ Users created')

  // Create demo organization
  let org = await prisma.organization.findUnique({ where: { slug: 'demo-agency' } })
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Demo Agency',
        slug: 'demo-agency',
        ownerId: ceo.id,
        plan: 'agency',
        maxUsers: 10,
        maxClients: 20,
        industry: 'Agencia Digital',
        country: 'Argentina',
        currency: 'USD',
      },
    })
  }
  console.log('✅ Organization created:', org.name)

  // Add members to org
  for (const [user, role] of [
    [ceo, 'admin'],
    [maria, 'trafficker'],
    [ana, 'trafficker'],
    [carlos, 'trafficker'],
    [laura, 'admin'],
  ] as const) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
      update: {},
      create: {
        organizationId: org.id,
        userId: user.id,
        role: role,
        status: 'active',
      },
    })
  }
  console.log('✅ Organization members added')

  // ─── CLIENTS ──────────────────────────────────────────────────────────────────

  const clientsData = [
    {
      id: 'demo-client-ecommerce',
      name: 'E-commerce SA',
      brand: 'TiendaOnline',
      industry: 'E-commerce',
      monthlyFee: 1500,
      commissionPct: 10,
      monthlySales: 45000,
      status: 'active' as const,
      serviceType: 'Meta Ads + Google Ads',
      country: 'Argentina',
      currency: 'USD',
      contactPerson: 'Diego Fernández',
      email: 'diego@tiendaonline.com',
      whatsapp: '+54 11 1234-5678',
    },
    {
      id: 'demo-client-saas',
      name: 'SaaS Corp',
      brand: 'SoftPro',
      industry: 'SaaS',
      monthlyFee: 2500,
      commissionPct: 0,
      status: 'active' as const,
      serviceType: 'Google Ads + SEO',
      country: 'México',
      currency: 'USD',
      contactPerson: 'Valentina Cruz',
      email: 'v.cruz@softpro.io',
    },
    {
      id: 'demo-client-retail',
      name: 'Retail Plus',
      brand: 'Retail Plus',
      industry: 'Retail',
      monthlyFee: 1200,
      commissionPct: 8,
      monthlySales: 28000,
      status: 'active' as const,
      serviceType: 'Meta Ads',
      country: 'Colombia',
      currency: 'USD',
      contactPerson: 'Andrés Morales',
    },
    {
      id: 'demo-client-local',
      name: 'Local Shop',
      brand: 'LocalShop',
      industry: 'Retail Local',
      monthlyFee: 800,
      commissionPct: 0,
      status: 'onboarding' as const,
      serviceType: 'Meta Ads + Redes Sociales',
      country: 'Argentina',
      currency: 'ARS',
    },
    {
      id: 'demo-client-inmobiliaria',
      name: 'Inmobiliaria Premium',
      brand: 'InmoPremium',
      industry: 'Real Estate',
      monthlyFee: 3000,
      commissionPct: 5,
      monthlySales: 120000,
      status: 'active' as const,
      serviceType: 'Meta Ads + Google Ads',
      country: 'Argentina',
      currency: 'USD',
      contactPerson: 'Patricia Vidal',
    },
    {
      id: 'demo-client-clinica',
      name: 'Clínica Estética',
      brand: 'BellaEstética',
      industry: 'Salud',
      monthlyFee: 1800,
      commissionPct: 0,
      status: 'risk' as const,
      serviceType: 'Meta Ads',
      country: 'Chile',
      currency: 'USD',
      contactPerson: 'Dra. Carla Méndez',
    },
  ]

  const clients: Record<string, { id: string; name: string }> = {}
  for (const clientData of clientsData) {
    const client = await prisma.client.upsert({
      where: { id: clientData.id },
      update: {},
      create: {
        ...clientData,
        organizationId: org.id,
        accountManagerId: ceo.id,
      },
    })
    clients[clientData.id] = client
    console.log('✅ Client created:', client.name)
  }

  // ─── PROJECTS ─────────────────────────────────────────────────────────────────

  const projectsData = [
    { id: 'demo-proj-1', name: 'Meta Ads Q1 - E-commerce SA', clientId: 'demo-client-ecommerce', serviceType: 'meta_ads' as const, status: 'active' as const, managerId: maria.id },
    { id: 'demo-proj-2', name: 'Google Ads - SaaS Corp', clientId: 'demo-client-saas', serviceType: 'google_ads' as const, status: 'active' as const, managerId: maria.id },
    { id: 'demo-proj-3', name: 'Landing Page - Inmobiliaria', clientId: 'demo-client-inmobiliaria', serviceType: 'landing_page' as const, status: 'onboarding' as const, managerId: laura.id },
  ]
  for (const projData of projectsData) {
    await prisma.project.upsert({
      where: { id: projData.id },
      update: {},
      create: { ...projData, organizationId: org.id },
    })
  }
  console.log('✅ Projects created')

  // ─── TASKS ────────────────────────────────────────────────────────────────────

  const tasksData = [
    {
      title: 'Optimizar campañas Meta Ads - E-commerce SA',
      description: 'Revisar audiencias, creativos y presupuesto. ROAS objetivo: 4x. Aumentar ventas 20%.',
      assignedTo: [maria.id],
      priority: 'high' as const,
      status: 'in_progress' as const,
      progressPercent: 60,
      clientId: 'demo-client-ecommerce',
      taskType: 'optimización',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Crear creatividades nuevas para Retail Plus - Marzo',
      description: '5 creatividades para campaña de primavera. Formato: 1:1 y 9:16. Colores de marca.',
      assignedTo: [ana.id],
      priority: 'medium' as const,
      status: 'pending' as const,
      progressPercent: 0,
      clientId: 'demo-client-retail',
      taskType: 'creativo',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Reporte mensual Febrero - SaaS Corp',
      description: 'Preparar informe con métricas: inversión, conversiones, ROAS, comparativa vs enero.',
      assignedTo: [laura.id],
      priority: 'high' as const,
      status: 'pending' as const,
      progressPercent: 0,
      clientId: 'demo-client-saas',
      taskType: 'reporte',
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Onboarding Local Shop - Accesos y configuración',
      description: 'Completar proceso de onboarding: obtener accesos FB/IG/Google, instalar pixel, crear primera campaña.',
      assignedTo: [maria.id, laura.id],
      priority: 'critical' as const,
      status: 'in_progress' as const,
      progressPercent: 40,
      clientId: 'demo-client-local',
      taskType: 'onboarding',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Revisión ROAS - Clínica Estética (ALERTA)',
      description: 'ROAS cayó de 3.2 a 1.8x este mes. Analizar causas y proponer plan de acción urgente.',
      assignedTo: [maria.id],
      priority: 'critical' as const,
      status: 'pending' as const,
      progressPercent: 0,
      clientId: 'demo-client-clinica',
      taskType: 'optimización',
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue
    },
    {
      title: 'Copy para anuncios Google - Inmobiliaria Premium',
      description: 'Redactar 10 variantes de anuncios para campañas de búsqueda. Keywords: inmobiliaria, departamentos, casa.',
      assignedTo: [carlos.id],
      priority: 'medium' as const,
      status: 'completed' as const,
      progressPercent: 100,
      clientId: 'demo-client-inmobiliaria',
      taskType: 'creativo',
      deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Auditoría pixel Meta - E-commerce SA',
      description: 'Verificar que todos los eventos estén disparando correctamente. Revisar Purchase, AddToCart, ViewContent.',
      assignedTo: [maria.id],
      priority: 'high' as const,
      status: 'pending' as const,
      progressPercent: 0,
      clientId: 'demo-client-ecommerce',
      taskType: 'auditoría',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Reunión de seguimiento quincenal - Retail Plus',
      description: 'Presentar métricas de la última quincena. Revisar creatividades aprobadas. Planificar Q2.',
      assignedTo: [laura.id, maria.id],
      priority: 'medium' as const,
      status: 'pending' as const,
      progressPercent: 0,
      clientId: 'demo-client-retail',
      taskType: 'reunión',
      deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
  ]

  for (const taskData of tasksData) {
    await prisma.task.create({
      data: {
        ...taskData,
        organizationId: org.id,
        createdById: ceo.id,
      },
    })
  }
  console.log('✅ Tasks created')

  // ─── REPORTS ──────────────────────────────────────────────────────────────────

  const reportsData = [
    {
      title: 'Reporte Mensual - Febrero 2026 - E-commerce SA',
      description: 'Resultados de Febrero 2026. Superamos el objetivo de ROAS en 15%. Crecimiento sostenido.',
      reportType: 'monthly' as const,
      submittedById: maria.id,
      clientId: 'demo-client-ecommerce',
      status: 'validated' as const,
      priority: 'medium' as const,
      investment: 12500,
      sales: 68000,
      roas: 5.44,
      previousSales: 54000,
      growthPct: 25.9,
      tasksCompleted: 12,
      tasksPending: 3,
      sentToClient: true,
    },
    {
      title: 'Problema crítico: ROAS cayó - Clínica Estética',
      description: 'ROAS actual 1.8x vs 3.2x del mes anterior. Causas identificadas: competencia aumentó presupuesto, creativos desactualizados. Plan de acción: nuevos creativos + ajuste de audiencias.',
      reportType: 'issue' as const,
      submittedById: maria.id,
      clientId: 'demo-client-clinica',
      status: 'pending' as const,
      priority: 'critical' as const,
    },
    {
      title: 'Insight: Videos 3x más conversiones - Retail Plus',
      description: 'Prueba A/B de 2 semanas. Videos generan 3x más conversiones que imágenes estáticas al mismo costo. Recomendamos aumentar producción de videos a 4 por semana.',
      reportType: 'insight' as const,
      submittedById: maria.id,
      clientId: 'demo-client-retail',
      status: 'review' as const,
      priority: 'high' as const,
    },
    {
      title: 'Reunión kick-off - Local Shop completada',
      description: 'Reunión de inicio completada. Cliente muy entusiasmado. Objetivos: 50 leads/mes a $15 CPA. Primer mes de prueba. Accesos obtenidos: FB, IG. Pendiente: Google Ads.',
      reportType: 'client_update' as const,
      submittedById: laura.id,
      clientId: 'demo-client-local',
      status: 'validated' as const,
      priority: 'medium' as const,
    },
  ]

  for (const reportData of reportsData) {
    await prisma.report.create({
      data: {
        ...reportData,
        organizationId: org.id,
        clientId: reportData.clientId,
        tags: [],
        fileUrls: [],
      },
    })
  }
  console.log('✅ Reports created')

  // ─── FINANCES ─────────────────────────────────────────────────────────────────

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const financesData = [
    { type: 'income', category: 'fee', description: 'Fee mensual - E-commerce SA', amount: 1500, clientId: 'demo-client-ecommerce', isPaid: true },
    { type: 'income', category: 'fee', description: 'Fee mensual - SaaS Corp', amount: 2500, clientId: 'demo-client-saas', isPaid: true },
    { type: 'income', category: 'fee', description: 'Fee mensual - Retail Plus', amount: 1200, clientId: 'demo-client-retail', isPaid: false },
    { type: 'income', category: 'commission', description: 'Comisión 10% - E-commerce SA ($45k ventas)', amount: 4500, clientId: 'demo-client-ecommerce', isPaid: false },
    { type: 'income', category: 'fee', description: 'Fee mensual - Inmobiliaria Premium', amount: 3000, clientId: 'demo-client-inmobiliaria', isPaid: true },
    { type: 'expense', category: 'salary', description: 'Sueldo María García - Marzo', amount: 1800, isPaid: true },
    { type: 'expense', category: 'salary', description: 'Sueldo Ana López - Marzo', amount: 1500, isPaid: true },
    { type: 'expense', category: 'salary', description: 'Sueldo Carlos Ruiz - Marzo', amount: 1400, isPaid: false },
    { type: 'expense', category: 'tool', description: 'Suscripción herramientas (Canva, Meta, etc.)', amount: 350, isPaid: true },
    { type: 'expense', category: 'other', description: 'Gastos operativos', amount: 200, isPaid: true },
  ]

  for (const finData of financesData) {
    await prisma.finance.create({
      data: {
        ...finData,
        organizationId: org.id,
        currency: 'USD',
        month: currentMonth,
        year: currentYear,
        date: new Date(currentYear, currentMonth - 1, 1),
      },
    })
  }
  console.log('✅ Finances created')

  // ─── KPIs ─────────────────────────────────────────────────────────────────────

  const kpiData = [
    { clientId: 'demo-client-ecommerce', investment: 12500, sales: 68000, roas: 5.44, cpa: 42, conversions: 298, growthPct: 25.9 },
    { clientId: 'demo-client-saas', investment: 8000, sales: 35000, roas: 4.38, cpa: 180, conversions: 44, growthPct: 12.1 },
    { clientId: 'demo-client-retail', investment: 5500, sales: 28000, roas: 5.09, cpa: 28, conversions: 196, growthPct: 8.3 },
    { clientId: 'demo-client-inmobiliaria', investment: 9000, sales: 120000, roas: 13.33, cpa: 450, conversions: 20, growthPct: 31.2 },
    { clientId: 'demo-client-clinica', investment: 4200, sales: 7560, roas: 1.8, cpa: 210, conversions: 20, growthPct: -43.8 },
  ]

  for (const kpi of kpiData) {
    await prisma.kPI.upsert({
      where: {
        organizationId_clientId_month_year: {
          organizationId: org.id,
          clientId: kpi.clientId,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        ...kpi,
        month: currentMonth,
        year: currentYear,
      },
    })
  }
  console.log('✅ KPIs created')

  // ─── OBJECTIVES ───────────────────────────────────────────────────────────────

  await prisma.objective.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'Facturación mensual $15,000 USD',
        description: 'Alcanzar $15,000 en ingresos totales este mes',
        type: 'organization',
        target: 15000,
        current: 8700,
        unit: 'USD',
        startDate: new Date(currentYear, currentMonth - 1, 1),
        endDate: new Date(currentYear, currentMonth, 0),
        status: 'active',
      },
      {
        organizationId: org.id,
        name: 'ROAS promedio 4x en todos los clientes',
        description: 'Mantener ROAS promedio de portafolio igual o superior a 4',
        type: 'organization',
        target: 4,
        current: 3.2,
        unit: 'x',
        startDate: new Date(currentYear, currentMonth - 1, 1),
        endDate: new Date(currentYear, currentMonth, 0),
        status: 'active',
      },
      {
        organizationId: org.id,
        name: 'Recuperar cuenta Clínica Estética',
        description: 'Llevar ROAS de Clínica Estética de 1.8x a 3x',
        type: 'team',
        target: 3,
        current: 1.8,
        unit: 'x ROAS',
        startDate: new Date(currentYear, currentMonth - 1, 1),
        endDate: new Date(currentYear, currentMonth, 0),
        status: 'active',
      },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Objectives created')

  // ─── AUDITS ───────────────────────────────────────────────────────────────────

  await prisma.audit.create({
    data: {
      organizationId: org.id,
      title: 'Auditoría de cuentas Meta Ads - Febrero 2026',
      processName: 'Revisión mensual de cuentas publicitarias',
      auditedUsers: [maria.id],
      createdById: ceo.id,
      auditFrom: new Date(currentYear, currentMonth - 2, 1),
      auditTo: new Date(currentYear, currentMonth - 1, 0),
      status: 'completed',
      executedAt: new Date(),
      complianceScore: 83,
      overallStatus: 'partial',
      notes: 'Buen desempeño general. Clínica Estética requiere atención urgente.',
      findings: {
        checklist: [
          { item: 'Pixel instalado y disparando correctamente', result: 'compliant', notes: '' },
          { item: 'Conversiones configuradas', result: 'partial', notes: 'Falta Purchase en Clínica Estética' },
          { item: 'Audiencias segmentadas correctamente', result: 'compliant', notes: '' },
          { item: 'ROAS superior a 3x', result: 'partial', notes: 'Clínica Estética: 1.8x' },
          { item: 'Creatividades actualizadas (< 30 días)', result: 'non_compliant', notes: 'Clínica Estética: 45 días sin creatividades nuevas' },
          { item: 'Estructura de campaña optimizada', result: 'compliant', notes: '' },
        ],
      },
    },
  })
  console.log('✅ Audit created')

  // ─── DOCUMENTS ────────────────────────────────────────────────────────────────

  await prisma.documentation.createMany({
    data: [
      {
        organizationId: org.id,
        title: 'SOP: Proceso de onboarding de nuevos clientes',
        content: `# SOP: Onboarding de nuevos clientes

## Semana 1: Discovery
- Reunión de kick-off con el cliente
- Completar brief de marca y objetivos
- Obtener todos los accesos (FB, IG, Google, sitio web)
- Auditoría de presencia digital actual

## Semana 2: Configuración técnica
- Instalar y verificar pixel de Meta
- Configurar Google Analytics y conversiones
- Crear estructura de campaña base
- Primera reunión de estrategia

## Semana 3-4: Lanzamiento
- Lanzar primera campaña
- Reunión de seguimiento a los 7 días
- Ajustes iniciales basados en datos

## Documentos que necesitamos del cliente
1. Logo en alta resolución (PNG transparente)
2. Manual de marca (si existe)
3. Acceso a Business Manager / cuenta de ads
4. Acceso a Google Ads
5. Acceso a Analytics y Search Console`,
        category: 'sop',
        authorId: ceo.id,
        status: 'published',
        tags: ['onboarding', 'proceso', 'cliente'],
        version: 2,
      },
      {
        organizationId: org.id,
        title: 'SOP: Revisión semanal de campañas',
        content: `# Revisión semanal de campañas

## Lunes (Revisión de fin de semana)
- Revisar métricas del fin de semana
- Identificar anomalías en gasto o rendimiento
- Ajustar pujas si es necesario

## Miércoles (Optimización)
- Revisar audiencias y ajustar
- Pausar anuncios de bajo rendimiento
- Testear nuevas variantes

## Viernes (Cierre de semana)
- Actualizar KPIs en sistema
- Generar reporte semanal
- Planificar próxima semana`,
        category: 'sop',
        authorId: laura.id,
        status: 'published',
        tags: ['campañas', 'revisión', 'semanal'],
        version: 1,
      },
      {
        organizationId: org.id,
        title: 'Template: Brief de campaña publicitaria',
        content: `# Brief de campaña

## Cliente
- Nombre:
- Marca:
- Contacto:

## Objetivo principal
(Ej: 50 leads a $15 CPA / ROAS 4x / 200 ventas)

## Presupuesto mensual
- Total: $
- Meta Ads: $
- Google Ads: $

## Audiencia objetivo
- Edad:
- Género:
- Intereses:
- Ubicación:

## KPIs objetivo
| Métrica | Objetivo |
|---------|----------|
| ROAS | |
| CPA | |
| CPM | |

## Mensaje principal
(¿Qué queremos comunicar?)

## Urgencia / Deadline
`,
        category: 'template',
        authorId: ceo.id,
        status: 'published',
        tags: ['template', 'brief', 'campaña'],
        version: 1,
      },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Documents created')

  // ─── MEETINGS ────────────────────────────────────────────────────────────────

  const meetingsData = [
    {
      title: 'Revisión semanal - E-commerce SA',
      clientId: 'demo-client-ecommerce',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      attendees: ['Rafael Demo', 'María García', 'Diego Fernández'],
      summary: 'Revisamos métricas de la semana. ROAS se mantiene en 5.4x. Decidimos aumentar presupuesto en 15% para escalar.',
      decisions: 'Aumentar presupuesto de $12,500 a $14,375. Crear 3 nuevos creativos de video. Mantener audiencias actuales.',
      agreedTasks: [
        { title: 'Crear 3 nuevos creativos de video para E-commerce SA' },
        { title: 'Ajustar presupuesto a $14,375' },
        { title: 'Preparar reporte de escalamiento' },
      ],
      nextMeetingDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      notes: 'Cliente muy satisfecho con resultados.',
    },
    {
      title: 'Kick-off - Local Shop',
      clientId: 'demo-client-local',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      attendees: ['Laura Torres', 'María García', 'Dueño Local Shop'],
      summary: 'Reunión inicial con Local Shop. Definimos objetivos y obtuvimos accesos iniciales. Falta Google Ads.',
      decisions: 'Empezar con Meta Ads primero. Presupuesto inicial $800/mes. Objetivo: 50 leads/mes.',
      agreedTasks: [
        { title: 'Configurar pixel Meta para Local Shop' },
        { title: 'Crear primera campaña de leads' },
        { title: 'Obtener acceso a Google Ads' },
      ],
      nextMeetingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Plan de recuperación - Clínica Estética',
      clientId: 'demo-client-clinica',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      attendees: ['Rafael Demo', 'María García'],
      summary: 'Reunión urgente por caída de ROAS. Identificamos que creativos tienen más de 45 días sin renovar. Competencia aumentó inversión.',
      decisions: 'Renovar todos los creativos esta semana. Probar audiencias nuevas. Si no mejora en 2 semanas, proponer cambio de estrategia al cliente.',
      agreedTasks: [
        { title: 'Renovar creativos Clínica Estética - URGENTE' },
        { title: 'Investigar audiencias nuevas para Clínica Estética' },
      ],
    },
  ]

  for (const meetingData of meetingsData) {
    await prisma.meeting.create({
      data: {
        ...meetingData,
        organizationId: org.id,
        createdById: ceo.id,
        fileUrls: [],
      },
    })
  }
  console.log('✅ Meetings created')

  // ─── RECORDINGS ──────────────────────────────────────────────────────────────

  const recordingsData = [
    {
      title: 'Reunión semanal E-commerce SA - Grabación',
      clientId: 'demo-client-ecommerce',
      url: 'https://meet.google.com/rec/example-ecommerce',
      platform: 'meet',
      duration: 45,
      transcription: 'Se revisaron métricas de la semana pasada. ROAS 5.4x, ventas $68k. Se acordó escalar presupuesto un 15%...',
    },
    {
      title: 'Kick-off Local Shop - Grabación',
      clientId: 'demo-client-local',
      url: 'https://zoom.us/rec/example-localshop',
      platform: 'zoom',
      duration: 60,
      transcription: 'Reunión inicial con nuevo cliente. Objetivo: 50 leads mensuales a CPA $15. Se obtuvo acceso a Facebook e Instagram...',
    },
    {
      title: 'Capacitación interna - Creativos para campañas',
      url: 'https://www.loom.com/share/example-training',
      platform: 'loom',
      duration: 22,
    },
  ]

  for (const recData of recordingsData) {
    await prisma.recording.create({
      data: {
        ...recData,
        organizationId: org.id,
        createdById: ceo.id,
      },
    })
  }
  console.log('✅ Recordings created')

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        organizationId: org.id,
        userId: ceo.id,
        title: '⚠️ ROAS crítico - Clínica Estética',
        message: 'El ROAS cayó de 3.2x a 1.8x este mes. Requiere acción urgente.',
        type: 'alert',
        priority: 'critical',
        isRead: false,
      },
      {
        organizationId: org.id,
        userId: ceo.id,
        title: 'Tarea atrasada - Revisión Clínica Estética',
        message: 'La tarea de revisión de ROAS está 1 día atrasada.',
        type: 'task',
        priority: 'high',
        isRead: false,
      },
      {
        organizationId: org.id,
        userId: ceo.id,
        title: 'Reporte pendiente - Retail Plus',
        message: '3 reportes del mes de Retail Plus están pendientes de revisión.',
        type: 'report',
        priority: 'medium',
        isRead: false,
      },
      {
        organizationId: org.id,
        userId: ceo.id,
        title: 'Pago pendiente - Retail Plus',
        message: 'El fee mensual de Retail Plus ($1,200) está pendiente de cobro.',
        type: 'payment',
        priority: 'high',
        isRead: false,
      },
      {
        organizationId: org.id,
        userId: maria.id,
        title: 'Nueva tarea asignada',
        message: 'Se te asignó: "Auditoría pixel Meta - E-commerce SA"',
        type: 'task',
        priority: 'high',
        isRead: false,
      },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Notifications created')

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('\n📋 Credenciales de acceso:')
  console.log('   CEO / Admin:   ceo@agencia.com     / AgencyAI2026!')
  console.log('   Manager:       pm@agencia.com       / AgencyAI2026!')
  console.log('   Trafficker:    maria@agencia.com    / AgencyAI2026!')
  console.log('   Trafficker:    designer@agencia.com / AgencyAI2026!')
  console.log('\n⚠️  Primero crear estos usuarios en Supabase Auth con la misma contraseña.')
  console.log('   Panel de Supabase: Authentication → Users → Invite user (o Create user)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

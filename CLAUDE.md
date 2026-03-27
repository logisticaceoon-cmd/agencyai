@AGENTS.md

## Fases completadas

### FASE 1 - SaaS Multi-tenant (completada)
- Schema multi-tenant con organizations, members, invitations
- Onboarding 3 pasos, plan-gating del sidebar
- API routes con workspace isolation

### FASE 2 - Rediseno visual y migracion auth (completada)
- Migracion de Clerk a Supabase Auth
- API routes migradas a lib/auth-supabase.ts
- Milestones de proyectos con CRUD y cron

### FASE 3A - Modulo Finanzas completo (completada)
- Transacciones con filtros, CSV export
- Facturas con items, impuestos, estados (draft/sent/paid/overdue)
- Comisiones por cliente con calculo automatico
- Rentabilidad por cliente con graficos
- Graficos Recharts (barras ingresos vs gastos, rentabilidad horizontal)

### FASE 3B - KPIs y Metricas (completada)
- CRUD de KPIs con filtro por cliente
- Registros de valores con historial
- Progreso circular, tendencia, alertas automaticas
- Graficos de linea por KPI

### FASE 3C - Objetivos y OKRs (completada)
- Objetivos por trimestre con key results
- Progreso automatico (promedio de KRs)
- Tabla resumen ordenada por avance

### FASE 3D - Agentes IA (completada)
- API /api/ai/chat con Anthropic API o mock inteligente
- AgentWidget flotante con chat, sugerencias, typing indicator
- Integrado en: Dashboard, Clientes, Proyectos, Tareas, Finanzas, Reportes, KPIs

### FASE 4A - Planes y Pricing (completada)
- Pagina /pricing publica con 3 planes (Free/Pro/Agency)
- Tabla comparativa de features y FAQ
- Hook usePlanLimits con feature flags por plan

### FASE 4B - Stripe y Facturacion (completada)
- Checkout session con mock mode si no hay keys
- Webhook para actualizar plan del workspace
- Customer portal para gestionar suscripcion
- Pagina /settings/billing

### FASE 4C - Portal del Cliente (completada)
- Acceso por token unico sin auth Supabase
- Paginas: landing, proyectos, reportes, facturas
- Permisos configurables por entidad
- API de gestion de accesos en /api/clients/[id]/portal

### FASE 4D - Gestion de Equipo (completada)
- Pagina /settings/team con CRUD de miembros
- Invitaciones por email con roles (admin/member/viewer)
- Cambio de rol y eliminacion de miembros
- Pagina /invite/[token] para aceptar invitaciones

### FASE 4E - Centro de Notificaciones (completada)
- NotificationCenter en el header con badge y dropdown
- Pagina /notifications con filtros y paginacion
- Polling automatico cada 30 segundos via useNotifications hook

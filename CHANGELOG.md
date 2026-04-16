# Changelog

## v1.0.0 (2026-04-16)

### SaaS Multi-tenant
- Schema multi-tenant con organizations, workspaces, members
- Onboarding 3 pasos con seleccion de tipo profesional
- Plan-gating del sidebar por nivel de suscripcion
- API routes con workspace isolation

### Auth
- Supabase Auth (migrado desde Clerk)
- Dual client: ANON para sesion, ADMIN para queries
- RLS policies en todas las tablas

### Modulos principales
- **Dashboard** - KPIs ejecutivos, tareas pendientes, actividad
- **CRM Clientes** - Gestion completa con accesos, contratos, status
- **Proyectos** - Por cliente, con milestones y CRUD completo
- **Tareas** - Kanban, prioridades, asignacion, subtareas
- **Finanzas** - Transacciones, facturas, comisiones, rentabilidad, graficos
- **Reportes** - Mensuales/semanales por cliente
- **KPIs** - Metricas con historial, progreso circular, alertas
- **Objetivos** - OKRs por trimestre con key results
- **Minutas** - Actas de reunion con tareas automaticas
- **Documentos** - SOPs, manuales, templates, procesos
- **Grabaciones** - Con extraccion de tareas
- **Notificaciones** - Centro con polling cada 90s
- **Portal Cliente** - Acceso por token unico
- **Equipo** - Miembros, roles, invitaciones por email

### Integraciones
- **Stripe** - Checkout, webhook, customer portal, 5 planes
- **AI** - Chat con Claude/GPT, widget flotante, acciones automaticas
- **Cowork API** - 9 endpoints REST con auth por API key
- **Email** - Invitaciones y notificaciones via Resend

### Paginas
- Landing page con features, pricing, CTA
- Pricing page con tabla comparativa y FAQ
- Paginas 404 y 500
- Settings: cuenta, workspace, equipo, billing, API keys

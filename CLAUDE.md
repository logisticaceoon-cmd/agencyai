# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server (Next.js 16)
npm run build        # Production build
npm run lint         # ESLint
npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run Prisma migrations (dev)
npm run db:push      # Push schema to DB without migration
npm run db:seed      # Seed database
```

## Architecture

**AgencyAI** is a multi-tenant SaaS platform for agencies/freelancers built with Next.js 16 App Router, Supabase Auth, Prisma ORM, and shadcn/ui.

### Multi-tenancy model

Every data query is scoped by `workspaceId` (= `organization.id`). The auth flow:
1. `getAuthContext()` in `lib/auth-supabase.ts` is called at the top of every API route
2. It uses the ANON Supabase client to read the user session from cookies, then looks up the user's workspace (as owner or member)
3. Returns an ADMIN Supabase client (bypasses RLS) + `workspaceId` for all subsequent queries
4. API routes destructure `{ supabase, workspaceId, userId }` and filter all queries by `workspaceId`

Helper: `isAuthError(auth)` type guard distinguishes auth errors from valid context.

### Route structure

- `app/(auth)/` - Login, register (public)
- `app/(dashboard)/` - Protected routes with shared Sidebar + Header layout
- `app/api/` - 30+ REST API routes, all using `getAuthContext()`
- `app/portal/` - Client portal with token-based access (no Supabase auth)
- `app/pricing/` - Public pricing page
- `app/onboarding/` - 3-step onboarding flow

### Key modules and their locations

| Module | Pages | API routes |
|--------|-------|------------|
| Clients | `(dashboard)/clients/` | `api/clients/` |
| Projects | `(dashboard)/projects/` | `api/projects/` |
| Tasks | `(dashboard)/tasks/` | `api/tasks/` |
| Finances | `(dashboard)/finances/` | `api/finances/` |
| KPIs | `(dashboard)/kpis/` | `api/kpis/` |
| Objectives | `(dashboard)/objectives/` | `api/objectives/` |
| Reports | `(dashboard)/reports/` | `api/reports/` |
| Notifications | `(dashboard)/notifications/` | `api/notifications/` |
| Team/Settings | `(dashboard)/settings/` | `api/members/`, `api/invitations/` |
| AI Chat | AgentWidget component | `api/ai/chat` |

### State management

- **Zustand stores** in `store/`: `useAuthStore`, `useNotificationStore`
- **Custom hooks** in `hooks/`: `useCurrentUser` (fetches `/api/auth/me`), `usePlanLimits` (feature gates), `useWorkspace`, `useNotifications` (polls every 90s)

### Plan-based feature gating

5 tiers defined in `lib/plans.ts`: free, starter, pro, agency, scale. The `usePlanLimits()` hook returns flags like `hasAI`, `hasPortal`, `hasFinances`, `hasKPIs`, `maxClients`, etc. Check these before rendering gated features.

### AI integration

- `/api/ai/chat` supports Anthropic Claude and OpenAI with fallback
- `components/ai/AgentWidget.tsx` is a floating chat widget integrated across all dashboard modules
- AI responses can include actions via `[ACTION:{"type":"create_task",...}]` syntax
- Professional type context from `lib/professional-types.ts` personalizes AI responses

### Database

Prisma schema in `prisma/schema.prisma`. Supabase PostgreSQL. Key tables: `organizations`, `organization_members`, `clients`, `projects`, `tasks`, `reports`, `finances`, `kpis`, `objectives`, `meetings`, `recordings`, `documentation`, `notifications`.

Supabase clients in `lib/supabase/`: `server.ts` (createClient for SSR, createAdminClient for service role), `client.ts` (browser).

### Payments

Stripe integration with mock mode when keys are missing. Checkout via `api/stripe/checkout`, webhook at `api/stripe/webhook`, customer portal at `api/stripe/portal`.

### Environment variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
Optional: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `REDIS_URL`, `CRON_SECRET`

## Important patterns

- **Language**: UI and code comments are in Spanish. Keep this consistent.
- **Next.js 16**: Read `node_modules/next/dist/docs/` before using any Next.js API - this version has breaking changes from training data.
- **No middleware.ts**: Auth is handled per-route via `getAuthContext()`, not via Next.js middleware.
- **Dual Supabase clients**: ANON for session/cookie reads, ADMIN for data queries. Never use ADMIN for auth checks.
- **UI components**: shadcn/ui in `components/ui/`, shared components in `components/shared/`, icons from `lucide-react`.

## Cowork API (integracion externa)

API REST en `app/api/cowork/` para que herramientas externas (Cowork desktop) se conecten via API key.

- **Auth**: Bearer token con API key validada en `lib/api-auth.ts` (`validateApiKey` + `isApiAuthError`)
- **Tabla**: `api_keys` en Supabase (migracion en `supabase/migrations/20260416_create_api_keys.sql`)
- **Gestion de keys**: Ruta `/api/cowork/api-keys` (usa auth de sesion via `getAuthContext`), pagina en `/settings/api-keys`

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/cowork/health` | GET | Health check (sin auth) |
| `/api/cowork/tasks` | GET | Listar tareas (filtros: date, status, client_id, project_id, assigned_to) |
| `/api/cowork/tasks` | POST | Crear tarea |
| `/api/cowork/tasks/[id]` | GET | Detalle de tarea |
| `/api/cowork/tasks/[id]` | PATCH | Actualizar tarea |
| `/api/cowork/tasks/[id]` | POST | Completar tarea (`{ action: "complete" }`) |
| `/api/cowork/clients` | GET | Listar clientes |
| `/api/cowork/projects` | GET | Listar proyectos |
| `/api/cowork/team` | GET | Listar miembros del equipo |

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

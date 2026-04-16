# AgencyAI

SaaS multi-tenant para agencias digitales, freelancers y equipos creativos. Centraliza clientes, proyectos, tareas, finanzas, KPIs y mas en una sola plataforma.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **UI**: Tailwind CSS 4 + shadcn/ui + Radix UI
- **State**: Zustand
- **Payments**: Stripe
- **AI**: Anthropic Claude / OpenAI
- **Email**: Resend
- **Charts**: Recharts

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Copiar `.env.example` a `.env.local` y configurar:

```env
# Supabase (obligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret

# Opcional
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
RESEND_API_KEY=re_...
CRON_SECRET=tu-cron-secret
```

### 3. Base de datos

```bash
npm run db:generate   # Generar Prisma client
npm run db:push       # Push schema a Supabase
npm run db:seed       # Seed data inicial
```

### 4. Ejecutar

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Modulos

| Modulo | Ruta | Descripcion |
|--------|------|-------------|
| Dashboard | `/dashboard` | KPIs, tareas pendientes, actividad |
| CRM Clientes | `/clients` | Gestion de clientes, accesos, contratos |
| Proyectos | `/projects` | Proyectos por cliente con milestones |
| Tareas | `/tasks` | Kanban, asignacion, prioridades |
| Finanzas | `/finances` | Transacciones, facturas, comisiones, rentabilidad |
| Reportes | `/reports` | Reportes mensuales/semanales por cliente |
| KPIs | `/kpis` | Metricas con historial y alertas |
| Objetivos | `/objectives` | OKRs por trimestre |
| Minutas | `/meetings` | Actas de reunion con tareas |
| Documentos | `/documentation` | SOPs, manuales, templates |
| Grabaciones | `/recordings` | Grabaciones con extraccion de tareas |
| Notificaciones | `/notifications` | Centro de notificaciones con polling |
| Portal Cliente | `/portal/[token]` | Acceso externo para clientes |
| Equipo | `/settings/team` | Miembros, roles, invitaciones |
| Billing | `/settings/billing` | Planes, Stripe, suscripciones |

## API Cowork

API REST para integrar herramientas externas (Cowork desktop).

### Autenticacion

```bash
Authorization: Bearer sk_agencyai_xxxxx
```

Generar keys en `/settings/api-keys`.

### Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/cowork/health` | Health check (sin auth) |
| GET | `/api/cowork/tasks` | Listar tareas |
| POST | `/api/cowork/tasks` | Crear tarea |
| GET | `/api/cowork/tasks/:id` | Detalle de tarea |
| PATCH | `/api/cowork/tasks/:id` | Actualizar tarea |
| POST | `/api/cowork/tasks/:id` | Completar tarea |
| GET | `/api/cowork/clients` | Listar clientes |
| GET | `/api/cowork/projects` | Listar proyectos |
| GET | `/api/cowork/team` | Listar equipo |

### Testing

```bash
bash scripts/test-cowork-api.sh
```

## Scripts

```bash
npm run dev          # Dev server
npm run build        # Build produccion
npm run lint         # ESLint
npm run db:generate  # Prisma generate
npm run db:migrate   # Prisma migrate dev
npm run db:push      # Push schema sin migracion
npm run db:seed      # Seed database
```

## Deploy

1. Conectar repo a [Vercel](https://vercel.com)
2. Configurar variables de entorno en Vercel dashboard
3. Deploy automatico en cada push a `main`

## Planes

| Plan | Precio | Usuarios | Clientes |
|------|--------|----------|----------|
| Free | $0 | 1 | 2 |
| Starter | $12/mes | 4 | 5 |
| Pro | $39/mes | 6 | 10 |
| Agency | $99/mes | 10 | 20 |
| Scale | $149/mes | 20 | 40 |

## Licencia

Privado. Todos los derechos reservados.

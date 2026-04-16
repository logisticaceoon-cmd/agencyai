# Deployment Guide - AgencyAI

## Deploy a Vercel

### 1. Conectar repositorio

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa tu repositorio de GitHub
3. Vercel detecta automaticamente que es Next.js

### 2. Variables de entorno

Configura estas variables en Vercel Dashboard → Settings → Environment Variables:

**Obligatorias:**

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase | `eyJ...` |
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://...` |
| `DIRECT_URL` | Direct connection (sin pooler) | `postgresql://...` |
| `NEXT_PUBLIC_APP_URL` | URL publica de tu app | `https://agencyai-iota.vercel.app` |
| `NEXTAUTH_SECRET` | Secret para JWT | Generar con `openssl rand -base64 32` |

**Opcionales (para features adicionales):**

| Variable | Servicio |
|----------|----------|
| `ANTHROPIC_API_KEY` | Claude AI (chat widget) |
| `OPENAI_API_KEY` | GPT fallback |
| `STRIPE_SECRET_KEY` | Pagos con Stripe |
| `STRIPE_WEBHOOK_SECRET` | Webhook de Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe frontend |
| `RESEND_API_KEY` | Envio de emails |
| `CRON_SECRET` | Proteccion de cron jobs |

### 3. Build settings

Vercel usa estos defaults para Next.js (no requieren configuracion):

- **Framework Preset**: Next.js
- **Build Command**: `next build`
- **Install Command**: `npm install`
- **Output Directory**: `.next`

### 4. Deploy

Push a `main` para deploy automatico. Cada PR genera un preview deployment.

```bash
git push origin main
```

## Supabase para produccion

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia las keys de Settings → API

### 2. Schema

Ejecuta las migraciones:

```bash
npm run db:push
```

O aplica las migraciones SQL manualmente desde `supabase/migrations/`.

### 3. RLS Policies

Las policies de Row Level Security se crean automaticamente con las migraciones. Verifica en Supabase Dashboard → Authentication → Policies.

### 4. Auth settings

En Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://agencyai-iota.vercel.app`
- **Redirect URLs**: `https://agencyai-iota.vercel.app/**`

## Health checks

El endpoint `/api/cowork/health` retorna el status de la API:

```bash
curl https://agencyai-iota.vercel.app/api/cowork/health
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "service": "AgencyAI Cowork API"
  }
}
```

## Stripe webhooks (produccion)

1. Ve a Stripe Dashboard → Developers → Webhooks
2. Agrega endpoint: `https://agencyai-iota.vercel.app/api/stripe/webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copia el webhook secret y configura `STRIPE_WEBHOOK_SECRET` en Vercel

## Cron jobs

El cron de milestones se ejecuta en `/api/cron/check-milestones`. Configura un cron externo o usa Vercel Cron:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-milestones",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## Monitoring

- **Vercel Analytics**: Activar en Vercel Dashboard → Analytics
- **Logs**: Vercel Dashboard → Deployments → Functions → Logs
- **Supabase**: Dashboard → Database → Query Performance

# AgencyAI — Guía de configuración

## Requisitos previos
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Resend](https://resend.com) (gratis)
- Cuenta en [Vercel](https://vercel.com) (gratis) para deploy

---

## Paso 1 — Instalar dependencias

```bash
npm install
```

---

## Paso 2 — Configurar Supabase

1. Ir a [supabase.com](https://supabase.com) → crear nuevo proyecto
2. Esperar que se provisione (~2 minutos)
3. Ir a **Project Settings → Database**
   - Copiar `Connection string` → URI → pegarlo como `DATABASE_URL`
   - Copiar `Connection string` → Session → pegarlo como `DIRECT_URL`
4. Ir a **Project Settings → API**
   - Copiar `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copiar `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copiar `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

5. Habilitar **Auth → Email** (habilitado por defecto)

6. Crear bucket de storage:
   - Ir a **Storage → New bucket**
   - Nombre: `agency-files`
   - Marcar como **Public**

---

## Paso 3 — Configurar Resend

1. Ir a [resend.com](https://resend.com) → crear cuenta
2. Ir a **API Keys → Create API Key**
3. Copiar la key → `RESEND_API_KEY`
4. (Opcional) Verificar un dominio para usar como remitente

---

## Paso 4 — Completar `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@tudominio.com
CEO_EMAIL=tu@email.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=cambia_esto_por_un_secreto_aleatorio_de_32_chars
CRON_SECRET=otro_secreto_para_proteger_el_cron

# Redis (opcional - para Bull queues)
REDIS_URL=redis://localhost:6379
```

---

## Paso 5 — Migrar la base de datos

```bash
# Generar el cliente de Prisma
npx prisma generate

# Crear las tablas en Supabase
npx prisma db push
```

---

## Paso 6 — Crear usuarios en Supabase Auth (para el seed)

Antes de correr el seed, crear los usuarios en Supabase Auth:

1. Ir a **Authentication → Users → Add user**
2. Crear estos usuarios con contraseña `AgencyAI2025!`:
   - `ceo@agencia.com`
   - `maria@agencia.com`
   - `designer@agencia.com`
   - `copy@agencia.com`
   - `pm@agencia.com`
   - `community@agencia.com`
   - `admin@agencia.com`

Luego correr el seed:

```bash
npx prisma db seed
```

---

## Paso 7 — Correr en local

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

**Login inicial:**
- Email: `ceo@agencia.com`
- Password: `AgencyAI2025!`

---

## Paso 8 — Deploy a Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

En el **Vercel Dashboard → Settings → Environment Variables**, agregar todas las variables de `.env.local` con sus valores de producción.

Cambiar `NEXT_PUBLIC_APP_URL` a tu dominio de Vercel.

---

## Estructura del proyecto

```
agencyai/
├── app/
│   ├── (auth)/         ← Login y registro
│   ├── (dashboard)/    ← Todas las páginas protegidas
│   └── api/            ← API routes
├── components/
│   ├── dashboard/      ← Sidebar, Header
│   └── shared/         ← Componentes reutilizables
├── lib/                ← Supabase, Prisma, utils
├── store/              ← Estado global (Zustand)
├── hooks/              ← Custom hooks
├── types/              ← TypeScript types
└── prisma/
    ├── schema.prisma   ← Schema de la DB
    └── seed.ts         ← Datos iniciales
```

---

## Módulos disponibles

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/` | KPIs, estado del equipo, alertas |
| Tareas | `/tasks` | Gestión completa de tareas |
| Reportes | `/reports` | Envío y validación de reportes |
| Auditorías | `/audits` | Auditorías de procesos |
| Clientes | `/clients` | Gestión de clientes |
| Documentos | `/docs` | SOPs, manuales, templates |
| Admin | `/admin` | Usuarios y configuración |

---

## Roles y permisos

| Acción | CEO | Manager | Team |
|--------|-----|---------|------|
| Ver todas las tareas | ✅ | ✅ | ❌ (solo las propias) |
| Crear tareas | ✅ | ✅ | ❌ |
| Validar tareas | ✅ | ✅ | ❌ |
| Subir reportes | ✅ | ✅ | ✅ |
| Validar reportes | ✅ | ✅ | ❌ |
| Crear auditorías | ✅ | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Ver admin | ✅ | ✅ | ❌ |

---

## Soporte

Si encontrás algún problema durante la configuración, revisá:
1. Que las variables de entorno estén correctamente seteadas
2. Que el bucket `agency-files` en Supabase Storage sea público
3. Que las tablas se hayan creado correctamente con `npx prisma db push`

---
name: AgencyAI Project
description: Full-stack Next.js app for marketing agency management - built from scratch
type: project
---

AgencyAI está construido en `C:\Users\Rafael B\agencyai`.

**Why:** Sistema integral de gestión operacional para agencia de marketing digital con 7-10 personas.

**Stack:** Next.js 16.2.1 (App Router) + TypeScript + Tailwind CSS v4 + Supabase + Prisma v5.22 + Zustand + Zod v4 + Resend.

**Estado:** Código generado completo (47 archivos TS/TSX, 26 API routes). Pendiente: configurar .env.local con credenciales Supabase/Resend y correr `npx prisma db push` + seed.

**Módulos implementados:**
- Auth (login/register con Supabase Auth, middleware, roles CEO/Manager/Team)
- Dashboard ejecutivo (KPIs, equipo, alertas)
- Tareas (CRUD completo, validación, comentarios, progreso)
- Reportes (subida con archivos, validación, comentarios)
- Auditorías (checklist, score automático)
- Clientes (perfil completo, tabs tareas/reportes/auditorías)
- Documentos (markdown, versionado)
- Admin (gestión usuarios, roles)
- Email diario vía Vercel Cron + Resend

**How to apply:** Cuando el usuario quiera continuar con este proyecto, ir a `C:\Users\Rafael B\agencyai`.

**Notas:**
- Zod v4 usa `.issues` en vez de `.errors` en ZodError
- Prisma v5 (bajado de v7 por breaking changes)
- Primer usuario registrado recibe rol CEO automáticamente
- `prisma.config.ts` existe pero es vestigio de Prisma v7, no se usa

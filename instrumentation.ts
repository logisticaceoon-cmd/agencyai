/**
 * Next.js Instrumentation — corre UNA VEZ al iniciar el servidor en Vercel
 * Aplica migraciones de schema que no están en Prisma schema
 */
export async function register() {
  // Solo en runtime Node.js (no Edge)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // ─── 021: member_client_assignments + payroll.member_user_id ─────────────
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS member_client_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        member_user_id TEXT NOT NULL,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(workspace_id, member_user_id, client_id)
      )
    `)

    await prisma.$executeRawUnsafe(`
      ALTER TABLE payroll ADD COLUMN IF NOT EXISTS member_user_id TEXT
    `)

    await prisma.$executeRawUnsafe(`
      ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS assigned_client_ids TEXT[] DEFAULT '{}'
    `)

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_mca_workspace_member ON member_client_assignments(workspace_id, member_user_id)
    `)

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_mca_client ON member_client_assignments(client_id)
    `)

    // ─── Seed: Stephany → sus 3 clientes ─────────────────────────────────────
    const STEPHANY_ID = '079cb567-1bb8-4726-b6ae-deaaf83ecbda'
    const WORKSPACE_ID = '41b4b8ab-2483-418d-bb29-d39084ca36f0'
    const STEPHANY_CLIENTS = [
      '8098a38a-faca-43b4-b593-339d2850dbee', // RMONIA SPA
      'ab2cf183-ea46-4080-88d4-6fb8cdda36d6', // YASMIN TENDENCIA
      '830bc4cf-532b-4a0f-a7be-8376732bcf7b', // AMURASPA.CL
    ]

    for (const clientId of STEPHANY_CLIENTS) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO member_client_assignments (workspace_id, member_user_id, client_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (workspace_id, member_user_id, client_id) DO NOTHING
      `, WORKSPACE_ID, STEPHANY_ID, clientId)
    }

    // Actualizar payroll de Stephany con su user_id
    await prisma.$executeRawUnsafe(`
      UPDATE payroll SET member_user_id = $1
      WHERE employee_name ILIKE '%stephany%' AND workspace_id = $2 AND member_user_id IS NULL
    `, STEPHANY_ID, WORKSPACE_ID)

    // Actualizar payroll de Rafael
    await prisma.$executeRawUnsafe(`
      UPDATE payroll SET member_user_id = $1
      WHERE employee_name ILIKE '%rafael%' AND workspace_id = $2 AND member_user_id IS NULL
    `, '2346440f-1d44-4327-9866-e442ec1ab7c2', WORKSPACE_ID)

    await prisma.$disconnect()
    console.log('[instrumentation] Schema migration 021 applied ✅')
  } catch (err) {
    console.error('[instrumentation] Migration error:', err)
  }
}

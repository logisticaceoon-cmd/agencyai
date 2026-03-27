import pg from 'pg'
import { config } from 'dotenv'
config({ path: '.env.local' })

const { Client } = pg
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  await client.connect()
  console.log('🔗 Conectado\n')

  // 1. Get all organizations
  const { rows: orgs } = await client.query('SELECT * FROM organizations')
  console.log(`📋 Encontradas ${orgs.length} organizaciones\n`)

  for (const org of orgs) {
    console.log(`\n═══ Migrando: ${org.name} (${org.id}) ═══`)

    // 2. Check if workspace already exists for this org
    const { rows: existing } = await client.query(
      'SELECT id FROM workspaces WHERE slug = $1 OR name = $2',
      [org.slug, org.name]
    )

    let workspaceId
    if (existing.length > 0) {
      workspaceId = existing[0].id
      console.log(`  ⏭️  Workspace ya existe: ${workspaceId}`)
    } else {
      // 3. Create workspace from organization
      const { rows: [ws] } = await client.query(`
        INSERT INTO workspaces (name, slug, plan, owner_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        org.name,
        org.slug,
        org.plan || 'free',
        org.ownerId || org.owner_id || 'unknown',
        org.createdAt || new Date().toISOString(),
        org.updatedAt || new Date().toISOString(),
      ])
      workspaceId = ws.id
      console.log(`  ✅ Workspace creado: ${workspaceId}`)
    }

    // 4. Migrate organization_members → workspace_members
    const { rows: orgMembers } = await client.query(
      `SELECT * FROM organization_members WHERE "organizationId" = $1`,
      [org.id]
    )
    console.log(`  📋 ${orgMembers.length} miembros encontrados`)

    for (const m of orgMembers) {
      // Check if already migrated
      const { rows: existingMember } = await client.query(
        'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [workspaceId, m.userId]
      )

      if (existingMember.length === 0) {
        // Get user info from users table
        const { rows: users } = await client.query(
          `SELECT "fullName", email FROM users WHERE id = $1`,
          [m.userId]
        )
        const userInfo = users[0] || {}

        await client.query(`
          INSERT INTO workspace_members (workspace_id, user_id, role, email, name, status, created_at)
          VALUES ($1, $2, $3, $4, $5, 'active', $6)
        `, [
          workspaceId,
          m.userId,
          m.role || 'member',
          userInfo.email || null,
          userInfo.fullName || null,
          m.createdAt || new Date().toISOString(),
        ])
        console.log(`    ✅ Miembro: ${userInfo.fullName || m.userId} (${m.role})`)
      } else {
        console.log(`    ⏭️  Miembro ya existe: ${m.userId}`)
      }
    }

    // 5. Update workspace_id on all related tables
    const tablesToUpdate = [
      { table: 'clients', orgCol: '"organizationId"' },
      { table: 'projects', orgCol: '"organizationId"' },
      { table: 'tasks', orgCol: '"organizationId"' },
      { table: 'reports', orgCol: '"organizationId"' },
      { table: 'kpis', orgCol: '"organizationId"' },
      { table: 'objectives', orgCol: '"organizationId"' },
      { table: 'notifications', orgCol: '"organizationId"' },
    ]

    for (const { table, orgCol } of tablesToUpdate) {
      try {
        const { rowCount } = await client.query(
          `UPDATE ${table} SET workspace_id = $1 WHERE ${orgCol} = $2 AND (workspace_id IS NULL OR workspace_id != $1)`,
          [workspaceId, org.id]
        )
        if (rowCount > 0) {
          console.log(`  ✅ ${table}: ${rowCount} filas actualizadas`)
        }
      } catch (err) {
        console.log(`  ⏭️  ${table}: ${err.message.slice(0, 80)}`)
      }
    }
  }

  // 6. Final verification
  console.log('\n═══════════════════════════════════════════')
  console.log('VERIFICACION FINAL')
  console.log('═══════════════════════════════════════════')

  const { rows: wsCount } = await client.query('SELECT COUNT(*) FROM workspaces')
  const { rows: wmCount } = await client.query('SELECT COUNT(*) FROM workspace_members')
  console.log(`✅ Workspaces: ${wsCount[0].count}`)
  console.log(`✅ Workspace Members: ${wmCount[0].count}`)

  // Check workspace_id coverage
  const tables = ['clients', 'projects', 'tasks', 'reports', 'kpis', 'objectives']
  for (const t of tables) {
    try {
      const { rows: [total] } = await client.query(`SELECT COUNT(*) as total FROM ${t}`)
      const { rows: [withWs] } = await client.query(`SELECT COUNT(*) as cnt FROM ${t} WHERE workspace_id IS NOT NULL`)
      console.log(`  ${t}: ${withWs.cnt}/${total.total} con workspace_id`)
    } catch {}
  }

  console.log('\n🎉 Migracion completada')
  await client.end()
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })

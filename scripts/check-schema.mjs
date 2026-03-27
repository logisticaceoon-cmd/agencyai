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

  // List all tables in public schema
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)
  console.log('Tablas existentes:')
  res.rows.forEach(r => console.log(`  - ${r.table_name}`))

  // Check if workspaces exists in any schema
  const ws = await client.query(`
    SELECT table_schema, table_name FROM information_schema.tables
    WHERE table_name = 'workspaces'
  `)
  console.log('\nworkspaces encontrada en:', ws.rows.length > 0 ? ws.rows : 'NINGUNA')

  // Check all schemas
  const schemas = await client.query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY schema_name
  `)
  console.log('\nSchemas:', schemas.rows.map(r => r.schema_name))

  await client.end()
}

run().catch(err => { console.error(err.message); process.exit(1) })

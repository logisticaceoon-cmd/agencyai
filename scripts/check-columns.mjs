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

  const tables = ['clients', 'projects', 'tasks', 'reports', 'kpis', 'objectives', 'notifications']
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [t])
    console.log(`\n=== ${t} ===`)
    res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (${r.udt_name})`))
  }

  await client.end()
}

run().catch(err => { console.error(err); process.exit(1) })

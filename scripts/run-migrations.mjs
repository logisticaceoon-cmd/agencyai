import pg from 'pg'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local' })

const { Client } = pg

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const migrations = [
  'supabase/migrations/004_finances.sql',
  'supabase/migrations/005_kpis.sql',
  'supabase/migrations/006_objectives.sql',
  'supabase/migrations/007_ai.sql',
  'supabase/migrations/008_billing.sql',
  'supabase/migrations/009_client_portal.sql',
]

async function run() {
  await client.connect()
  console.log('Conectado a la base de datos\n')

  for (const file of migrations) {
    const sql = readFileSync(file, 'utf8')
    try {
      await client.query(sql)
      console.log(`✅ ${file} ejecutado correctamente`)
    } catch (err) {
      console.error(`❌ Error en ${file}:`, err.message)
    }
  }

  // Verify tables
  console.log('\n--- Verificando tablas ---')
  const tables = [
    'invoices', 'expense_categories', 'kpis', 'kpi_records',
    'objectives', 'key_results', 'ai_conversations',
    'billing_history', 'client_portal_access',
  ]

  for (const table of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM ${table}`)
      console.log(`✅ ${table} — OK (${res.rows[0].count} filas)`)
    } catch (err) {
      console.error(`❌ ${table} — ERROR: ${err.message}`)
    }
  }

  await client.end()
  console.log('\n🎉 Migraciones completadas')
}

run().catch(err => {
  console.error('Error fatal:', err.message)
  process.exit(1)
})

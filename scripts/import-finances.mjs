import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Get first workspace
const { data: ws } = await supabase.from('workspaces').select('id').limit(1).single()
if (!ws) { console.error('No workspace found'); process.exit(1) }
const workspaceId = ws.id
console.log(`Workspace: ${workspaceId}`)

// =====================
// CONTRATOS (Traffickers)
// =====================
const contracts = [
  { code: 'TD2026-001', trafficker_name: 'Carlos Mendez', client_name: 'Empresa Alpha', service: 'Meta Ads + Google Ads', monthly_fee: 1500, start_date: '2026-01-01', status: 'active' },
  { code: 'TD2026-002', trafficker_name: 'Laura Gomez', client_name: 'Startup Beta', service: 'Google Ads', monthly_fee: 1200, start_date: '2026-02-01', status: 'active' },
  { code: 'TD2026-003', trafficker_name: 'Diego Ruiz', client_name: 'Ecommerce Gamma', service: 'Meta Ads + TikTok Ads', monthly_fee: 2000, start_date: '2026-01-15', status: 'active' },
  { code: 'TD2026-004', trafficker_name: 'Ana Torres', client_name: 'SaaS Delta', service: 'LinkedIn Ads', monthly_fee: 1800, start_date: '2026-03-01', status: 'active' },
  { code: 'TD2026-005', trafficker_name: 'Miguel Santos', client_name: 'Fintech Epsilon', service: 'Google Ads + YouTube', monthly_fee: 2500, start_date: '2025-11-01', end_date: '2026-04-30', status: 'active' },
]

console.log('\n--- Importando contratos ---')
for (const c of contracts) {
  const { error } = await supabase.from('contracts').insert({ workspace_id: workspaceId, ...c })
  if (error) console.error(`Error contrato ${c.code}:`, error.message)
  else console.log(`OK: ${c.code} - ${c.trafficker_name}`)
}

// =====================
// GASTOS (expenses)
// =====================
const expenses = [
  { type: 'expense', category: 'tool', description: 'Suscripcion Metricool', amount: 49, date: '2026-04-01' },
  { type: 'expense', category: 'tool', description: 'Suscripcion Semrush', amount: 129, date: '2026-04-01' },
  { type: 'expense', category: 'ads_spend', description: 'Meta Ads - Empresa Alpha', amount: 3500, date: '2026-04-03' },
  { type: 'expense', category: 'ads_spend', description: 'Google Ads - Startup Beta', amount: 2200, date: '2026-04-03' },
  { type: 'expense', category: 'ads_spend', description: 'TikTok Ads - Ecommerce Gamma', amount: 1800, date: '2026-04-04' },
  { type: 'expense', category: 'tool', description: 'Hosting Vercel Pro', amount: 20, date: '2026-04-01' },
  { type: 'expense', category: 'tool', description: 'Supabase Pro', amount: 25, date: '2026-04-01' },
  { type: 'expense', category: 'other', description: 'Dominio agencyai.com renovacion', amount: 15, date: '2026-04-02' },
  { type: 'expense', category: 'tool', description: 'Canva Pro equipo', amount: 120, date: '2026-04-01' },
  { type: 'expense', category: 'other', description: 'Contador freelance', amount: 200, date: '2026-04-05' },
]

console.log('\n--- Importando gastos ---')
for (const g of expenses) {
  const { error } = await supabase.from('transactions').insert({ workspace_id: workspaceId, ...g })
  if (error) console.error(`Error gasto "${g.description}":`, error.message)
  else console.log(`OK: ${g.description} - $${g.amount}`)
}

// =====================
// NOMINAS (payroll)
// =====================
const payrollEntries = [
  { employee_name: 'Carlos Mendez', role: 'Trafficker Senior', base_salary: 1800, bonus: 200, deductions: 100, period: '2026-04', pay_date: '2026-04-30', status: 'pending' },
  { employee_name: 'Laura Gomez', role: 'Trafficker', base_salary: 1400, bonus: 0, deductions: 70, period: '2026-04', pay_date: '2026-04-30', status: 'pending' },
  { employee_name: 'Diego Ruiz', role: 'Trafficker', base_salary: 1500, bonus: 150, deductions: 80, period: '2026-04', pay_date: '2026-04-30', status: 'pending' },
  { employee_name: 'Ana Torres', role: 'Trafficker Junior', base_salary: 1100, bonus: 0, deductions: 55, period: '2026-04', pay_date: '2026-04-30', status: 'pending' },
  { employee_name: 'Sofia Ramirez', role: 'Community Manager', base_salary: 1000, bonus: 0, deductions: 50, period: '2026-04', pay_date: '2026-04-30', status: 'pending' },
  { employee_name: 'Rafael B', role: 'Director', base_salary: 3000, bonus: 500, deductions: 200, period: '2026-04', pay_date: '2026-04-30', status: 'pending' },
]

console.log('\n--- Importando nominas ---')
for (const p of payrollEntries) {
  const net = p.base_salary + p.bonus - p.deductions
  const { error } = await supabase.from('payroll').insert({ workspace_id: workspaceId, ...p, net_salary: net })
  if (error) console.error(`Error nomina "${p.employee_name}":`, error.message)
  else console.log(`OK: ${p.employee_name} - $${net} neto`)
}

console.log('\n=== Importacion completada ===')

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: { users } } = await supabase.auth.admin.listUsers()
console.log('=== USUARIOS AUTH ===')
users.forEach(u => console.log(`  ${u.id} | ${u.email} | ${u.user_metadata?.full_name || 'sin nombre'}`))

const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('*')
console.log('\n=== WORKSPACES ===')
console.log('Error:', wsErr)
if (workspaces) workspaces.forEach(w => console.log(`  ${w.id} | ${w.name} | owner: ${w.owner_id} | plan: ${w.plan}`))
else console.log('  (vacío)')

const { data: members, error: mErr } = await supabase.from('workspace_members').select('*')
console.log('\n=== WORKSPACE_MEMBERS ===')
console.log('Error:', mErr)
if (members) members.forEach(m => console.log(`  ws:${m.workspace_id} | user:${m.user_id} | ${m.email} | ${m.role} | ${m.status}`))
else console.log('  (vacío)')

// Cross-reference: which auth users DON'T have a workspace?
console.log('\n=== USUARIOS SIN WORKSPACE ===')
for (const u of users) {
  const hasWs = workspaces?.some(w => w.owner_id === u.id)
  const hasMember = members?.some(m => m.user_id === u.id)
  if (!hasWs && !hasMember) {
    console.log(`  ❌ ${u.email} (${u.id}) - NO TIENE WORKSPACE`)
  }
}

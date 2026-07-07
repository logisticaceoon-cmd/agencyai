/**
 * One-time migration endpoint — call once to apply schema changes
 * Protected by CRON_SECRET env var
 * DELETE this file after migration is applied
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: Record<string, string> = {}

  // Step 1: Create member_client_assignments table
  const { error: e1 } = await supabase.rpc('exec_migration', {
    sql: `CREATE TABLE IF NOT EXISTS member_client_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      member_user_id TEXT NOT NULL,
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(workspace_id, member_user_id, client_id)
    )`
  }).single()
  results.create_table = e1 ? `ERROR: ${e1.message}` : 'OK'

  // Step 2: Add payroll.member_user_id
  const { error: e2 } = await supabase.rpc('exec_migration', {
    sql: `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS member_user_id TEXT`
  }).single()
  results.payroll_col = e2 ? `ERROR: ${e2.message}` : 'OK'

  // Step 3: Add workspace_members.assigned_client_ids
  const { error: e3 } = await supabase.rpc('exec_migration', {
    sql: `ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS assigned_client_ids TEXT[] DEFAULT '{}'`
  }).single()
  results.wm_col = e3 ? `ERROR: ${e3.message}` : 'OK'

  // Step 4: Seed member assignments (configured via env vars)
  const seedUserId = process.env.STEPHANY_USER_ID
  const seedWorkspaceId = process.env.DEFAULT_WORKSPACE_ID
  const seedClientIds = (process.env.SEED_CLIENT_IDS || '').split(',').filter(Boolean)

  if (seedUserId && seedWorkspaceId && seedClientIds.length > 0) {
    for (const clientId of seedClientIds) {
      await supabase.from('member_client_assignments').upsert({
        workspace_id: seedWorkspaceId,
        member_user_id: seedUserId,
        client_id: clientId,
      }, { onConflict: 'workspace_id,member_user_id,client_id' })
    }
    results.seed_assignments = 'OK'
  } else {
    results.seed_assignments = 'SKIPPED (env vars not set)'
  }

  return NextResponse.json({ message: 'Migration applied', results })
}

-- 021: member_client_assignments + payroll.member_user_id + workspace_members.assigned_client_ids

-- Tabla de asignaciones cliente ↔ miembro (fuente de verdad)
CREATE TABLE IF NOT EXISTS member_client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  member_user_id TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, member_user_id, client_id)
);

-- Vincular payroll a usuario real
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS member_user_id TEXT;

-- Clientes asignados directamente en workspace_members (cache rápido)
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS assigned_client_ids TEXT[] DEFAULT '{}';

-- RLS para member_client_assignments
ALTER TABLE member_client_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mca_select" ON member_client_assignments;
CREATE POLICY "mca_select" ON member_client_assignments
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text AND status = 'active'
    )
  );

-- Index para queries rápidas
CREATE INDEX IF NOT EXISTS idx_mca_workspace_member ON member_client_assignments(workspace_id, member_user_id);
CREATE INDEX IF NOT EXISTS idx_mca_client ON member_client_assignments(client_id);

-- 020: workspace_invitations table + unique constraint on workspace_members(workspace_id, email)

-- Create workspace_invitations if not exists
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'trafficker',
  token        TEXT NOT NULL UNIQUE,
  invited_by   TEXT,
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Ensure unique constraint on (workspace_id, email) for upsert to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workspace_invitations_workspace_id_email_key'
  ) THEN
    ALTER TABLE workspace_invitations
      ADD CONSTRAINT workspace_invitations_workspace_id_email_key
      UNIQUE (workspace_id, email);
  END IF;
END $$;

-- Add unique constraint on workspace_members(workspace_id, email) for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workspace_members_workspace_id_email_key'
  ) THEN
    ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_workspace_id_email_key
      UNIQUE (workspace_id, email);
  END IF;
END $$;

-- RLS for workspace_invitations
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Allow workspace owners/admins to manage invitations (via service role / admin client)
-- Service role bypasses RLS so these policies are for anon/authenticated access
DROP POLICY IF EXISTS "wi_select" ON workspace_invitations;
CREATE POLICY "wi_select" ON workspace_invitations
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text AND status = 'active'
    )
  );

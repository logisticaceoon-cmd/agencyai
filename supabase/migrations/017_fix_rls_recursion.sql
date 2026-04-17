-- ============================================================
-- 017: Fix infinite recursion in workspaces/workspace_members RLS
-- ============================================================
-- Problem: ws_select policy on workspaces queried workspace_members,
-- and wm_select policy on workspace_members queried workspaces,
-- causing "infinite recursion detected in policy for relation workspaces"
--
-- Solution: Use a SECURITY DEFINER function that bypasses RLS
-- to look up workspace IDs, breaking the recursion cycle.
-- Also removed duplicate "enable_all_for_authenticated" policies.

-- 1. Create SECURITY DEFINER helper (bypasses RLS internally)
CREATE OR REPLACE FUNCTION get_user_workspace_ids(uid text)
RETURNS SETOF uuid AS $$
  SELECT id FROM workspaces WHERE owner_id = uid
  UNION
  SELECT workspace_id FROM workspace_members WHERE user_id = uid AND status = 'active'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop old workspaces policies
DROP POLICY IF EXISTS "enable_all_for_authenticated" ON workspaces;
DROP POLICY IF EXISTS "ws_select" ON workspaces;
DROP POLICY IF EXISTS "ws_insert" ON workspaces;
DROP POLICY IF EXISTS "ws_update" ON workspaces;

-- 3. Create clean workspaces policies
CREATE POLICY "ws_select" ON workspaces FOR SELECT
  USING (id IN (SELECT get_user_workspace_ids(auth.uid()::text)));

CREATE POLICY "ws_insert" ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY "ws_update" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid()::text);

-- 4. Drop old workspace_members policies
DROP POLICY IF EXISTS "enable_all_for_authenticated" ON workspace_members;
DROP POLICY IF EXISTS "wm_select" ON workspace_members;
DROP POLICY IF EXISTS "wm_insert" ON workspace_members;
DROP POLICY IF EXISTS "wm_update" ON workspace_members;
DROP POLICY IF EXISTS "wm_delete" ON workspace_members;

-- 5. Create clean workspace_members policies
CREATE POLICY "wm_select" ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR workspace_id IN (SELECT get_user_workspace_ids(auth.uid()::text))
  );

CREATE POLICY "wm_insert" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid()::text)));

CREATE POLICY "wm_update" ON workspace_members FOR UPDATE
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid()::text)));

CREATE POLICY "wm_delete" ON workspace_members FOR DELETE
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid()::text)));

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

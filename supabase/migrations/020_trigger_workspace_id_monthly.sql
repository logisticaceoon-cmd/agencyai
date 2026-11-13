-- Migration: auto-fill workspace_id on finance_client_monthly from parent finance_clients
-- Prevents workspace_id = NULL when inserting records directly in Supabase

CREATE OR REPLACE FUNCTION fill_workspace_id_from_finance_client()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT workspace_id INTO NEW.workspace_id
    FROM finance_clients
    WHERE id = NEW.client_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_fill_workspace_id ON finance_client_monthly;
CREATE TRIGGER trg_fill_workspace_id
  BEFORE INSERT ON finance_client_monthly
  FOR EACH ROW
  EXECUTE FUNCTION fill_workspace_id_from_finance_client();

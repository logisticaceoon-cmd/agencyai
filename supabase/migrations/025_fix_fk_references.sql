-- ============================================================
-- Migration 025: Fix FK references that point to wrong tables
-- Migrations 018 and 019 referenced organizations(id) instead of workspaces(id)
-- ============================================================

-- Fix google_calendar_tokens FK (migration 018)
-- The column may reference organizations or not have FK at all
-- Drop existing FK if any, then add correct one
DO $$ BEGIN
  ALTER TABLE public.google_calendar_tokens
    DROP CONSTRAINT IF EXISTS google_calendar_tokens_workspace_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table OR duplicate_object THEN NULL;
END $$;

-- Fix performance_logs FK (migration 019)
DO $$ BEGIN
  ALTER TABLE public.performance_logs
    DROP CONSTRAINT IF EXISTS performance_logs_workspace_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.performance_logs
    ADD CONSTRAINT performance_logs_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table OR duplicate_object THEN NULL;
END $$;

-- Fix performance_reports FK (migration 019)
DO $$ BEGIN
  ALTER TABLE public.performance_reports
    DROP CONSTRAINT IF EXISTS performance_reports_workspace_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.performance_reports
    ADD CONSTRAINT performance_reports_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table OR duplicate_object THEN NULL;
END $$;

-- Add missing FK constraints on tables that lack them
DO $$ BEGIN
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.trafficker_contracts ADD CONSTRAINT trafficker_contracts_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.contract_monthly_records ADD CONSTRAINT cmr_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.service_categories ADD CONSTRAINT sc_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.finance_clients ADD CONSTRAINT fc_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.finance_client_monthly ADD CONSTRAINT fcm_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR undefined_column OR undefined_table THEN NULL;
END $$;

-- Fix performance RLS policies that reference wrong table
DROP POLICY IF EXISTS "Users can read own perf_logs" ON performance_logs;
DROP POLICY IF EXISTS "Users can insert own perf_logs" ON performance_logs;
DROP POLICY IF EXISTS "Users can read own perf_reports" ON performance_reports;

CREATE POLICY "perf_logs_select" ON performance_logs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

CREATE POLICY "perf_logs_insert" ON performance_logs FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

CREATE POLICY "perf_reports_select" ON performance_reports FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

-- Grant schema permissions to Supabase roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Add default UUIDs to Prisma tables (id TEXT without default)
ALTER TABLE clients ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE projects ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE tasks ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE reports ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE kpis ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE objectives ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Make organizationId nullable (workspace_id is the new FK)
ALTER TABLE clients ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE reports ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE kpis ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE objectives ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN "organizationId" DROP NOT NULL;

-- Add timestamp defaults
ALTER TABLE clients ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE clients ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE projects ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE projects ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE tasks ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE tasks ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE reports ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE reports ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE kpis ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE kpis ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE objectives ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE objectives ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE notifications ALTER COLUMN "createdAt" SET DEFAULT now();

-- Fix RLS: workspace_members - user can see own membership
DROP POLICY IF EXISTS "wm_select" ON workspace_members;
CREATE POLICY "wm_select" ON workspace_members FOR SELECT USING (
  user_id = auth.uid()::text
  OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text)
);

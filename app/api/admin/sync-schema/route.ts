import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Ruta temporal de migración — ejecutar una vez, luego quitar
// Protegida por API key de AgencyAi
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const apiKey = authHeader.replace('Bearer ', '')
  if (!process.env.AGENCYAI_API_KEY || apiKey !== process.env.AGENCYAI_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const results: string[] = []
  const errors: string[] = []

  async function run(name: string, sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql)
      results.push(`✅ ${name}`)
    } catch (e: any) {
      errors.push(`❌ ${name}: ${e.message}`)
    }
  }

  // 1. Agregar columna client_id
  await run('Agregar client_id a finance_clients',
    `ALTER TABLE finance_clients ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL`)

  await run('Índice en finance_clients.client_id',
    `CREATE INDEX IF NOT EXISTS idx_finance_clients_client_id ON finance_clients(client_id)`)

  // 2. Normalizar nombres
  await run('Normalizar nombre Amura Spa Chile',
    `UPDATE finance_clients SET client_name='Amura Spa Chile' WHERE id='999c0592-af35-477b-855f-4af7aa157234'`)
  await run('Normalizar nombre Bendita Shop Chile',
    `UPDATE finance_clients SET client_name='Bendita Shop Chile' WHERE id='996941a5-c9cc-4131-9508-d40beea61c8e'`)
  await run('Normalizar nombre Divina Store',
    `UPDATE finance_clients SET client_name='Divina Store' WHERE id='5175bfeb-7add-4709-8204-daee9f09c69e'`)
  await run('Normalizar nombre Food4Kids',
    `UPDATE finance_clients SET client_name='Food4Kids' WHERE id='0830a20c-50b2-4314-83e4-7f2995b7a734'`)
  await run('Normalizar nombre Yasmin Tendencia',
    `UPDATE finance_clients SET client_name='Yasmin Tendencia' WHERE id='91ce03cd-1ff3-4c20-84b9-ad85e0de1911'`)

  // 3. Enlazar client_id en registros existentes
  await run('Link Amura Spa Chile',
    `UPDATE finance_clients SET client_id='830bc4cf-532b-4a0f-a7be-8376732bcf7b'::uuid WHERE id='999c0592-af35-477b-855f-4af7aa157234'`)
  await run('Link Bendita Shop Chile',
    `UPDATE finance_clients SET client_id='8a2c86e7-7c0e-4bd1-b4e0-4981e5feb1b7'::uuid WHERE id='996941a5-c9cc-4131-9508-d40beea61c8e'`)
  await run('Link Divina Store',
    `UPDATE finance_clients SET client_id='d5199dfd-441a-4945-bc64-12e31e0eceec'::uuid WHERE id='5175bfeb-7add-4709-8204-daee9f09c69e'`)
  await run('Link Food4Kids',
    `UPDATE finance_clients SET client_id='6b7a8e81-07ac-4227-90df-b944e5fc91af'::uuid WHERE id='0830a20c-50b2-4314-83e4-7f2995b7a734'`)
  await run('Link RMONIA SPA',
    `UPDATE finance_clients SET client_id='8098a38a-faca-43b4-b593-339d2850dbee'::uuid WHERE id='67c11f07-85ba-4369-8798-d56cdcef29d6'`)
  await run('Link Yasmin Tendencia',
    `UPDATE finance_clients SET client_id='ab2cf183-ea46-4080-88d4-6fb8cdda36d6'::uuid WHERE id='91ce03cd-1ff3-4c20-84b9-ad85e0de1911'`)
  await run('Link Danger Pink',
    `UPDATE finance_clients SET client_id='aab35527-335f-421d-b2c8-c7103c50d846'::uuid WHERE client_name='Danger Pink' AND workspace_id='41b4b8ab-2483-418d-bb29-d39084ca36f0'`)

  // 4. Crear funciones y triggers bidireccionales
  await run('Función: clients INSERT → finance_clients', `
    CREATE OR REPLACE FUNCTION fn_sync_client_to_finance()
    RETURNS TRIGGER AS $$
    BEGIN
      IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
      IF NOT EXISTS (SELECT 1 FROM finance_clients WHERE client_id = NEW.id AND deleted_at IS NULL) THEN
        INSERT INTO finance_clients (workspace_id, client_name, client_id, status, contract_cost, commission_percent, currency, created_at, updated_at)
        VALUES (
          NEW.workspace_id, NEW.name, NEW.id,
          CASE WHEN NEW.status = 'active' THEN 'active' ELSE 'inactive' END,
          COALESCE((NEW."monthlyFee")::numeric, 0),
          COALESCE((NEW."commissionPct")::numeric, 0),
          COALESCE(NEW.currency, 'USD'), NOW(), NOW()
        );
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql`)

  await run('Función: clients UPDATE → finance_clients', `
    CREATE OR REPLACE FUNCTION fn_sync_client_update_to_finance()
    RETURNS TRIGGER AS $$
    BEGIN
      IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
      UPDATE finance_clients SET
        client_name = NEW.name,
        status = CASE WHEN NEW.status = 'active' THEN 'active' ELSE 'inactive' END,
        deleted_at = NEW.deleted_at,
        updated_at = NOW()
      WHERE client_id = NEW.id;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql`)

  await run('Función: finance_clients INSERT → clients', `
    CREATE OR REPLACE FUNCTION fn_sync_finance_to_client()
    RETURNS TRIGGER AS $$
    DECLARE new_client_id UUID;
    BEGIN
      IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
      IF NEW.client_id IS NULL THEN
        INSERT INTO clients ("organizationId", workspace_id, name, status, "monthlyFee", "commissionPct", currency, "createdAt", "updatedAt")
        VALUES (
          NEW.workspace_id, NEW.workspace_id, NEW.client_name,
          CASE WHEN NEW.status = 'active' THEN 'active' ELSE 'inactive' END,
          COALESCE(NEW.contract_cost, 0), COALESCE(NEW.commission_percent, 0),
          COALESCE(NEW.currency, 'USD'), NOW(), NOW()
        ) RETURNING id INTO new_client_id;
        NEW.client_id = new_client_id;
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql`)

  await run('Función: finance_clients UPDATE → clients', `
    CREATE OR REPLACE FUNCTION fn_sync_finance_update_to_client()
    RETURNS TRIGGER AS $$
    BEGIN
      IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
      IF NEW.client_id IS NOT NULL THEN
        UPDATE clients SET
          name = NEW.client_name,
          status = CASE WHEN NEW.status = 'active' THEN 'active' ELSE 'inactive' END,
          deleted_at = NEW.deleted_at,
          "updatedAt" = NOW()
        WHERE id = NEW.client_id;
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql`)

  await run('Triggers en tabla clients', `
    DROP TRIGGER IF EXISTS trg_clients_insert_to_finance ON clients;
    CREATE TRIGGER trg_clients_insert_to_finance AFTER INSERT ON clients FOR EACH ROW EXECUTE FUNCTION fn_sync_client_to_finance();
    DROP TRIGGER IF EXISTS trg_clients_update_to_finance ON clients;
    CREATE TRIGGER trg_clients_update_to_finance AFTER UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION fn_sync_client_update_to_finance()`)

  await run('Triggers en tabla finance_clients', `
    DROP TRIGGER IF EXISTS trg_finance_insert_to_clients ON finance_clients;
    CREATE TRIGGER trg_finance_insert_to_clients BEFORE INSERT ON finance_clients FOR EACH ROW EXECUTE FUNCTION fn_sync_finance_to_client();
    DROP TRIGGER IF EXISTS trg_finance_update_to_clients ON finance_clients;
    CREATE TRIGGER trg_finance_update_to_clients AFTER UPDATE ON finance_clients FOR EACH ROW EXECUTE FUNCTION fn_sync_finance_update_to_client()`)

  return NextResponse.json({
    success: errors.length === 0,
    results,
    errors,
    timestamp: new Date().toISOString(),
  })
}

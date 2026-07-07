-- Add expiration to client portal tokens
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ;

-- Set default expiry for existing tokens (90 days from now)
UPDATE clients
SET portal_token_expires_at = NOW() + INTERVAL '90 days'
WHERE access_token IS NOT NULL AND portal_token_expires_at IS NULL;

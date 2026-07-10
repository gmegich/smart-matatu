-- Reference: schema currently in your Supabase project (as shared).
-- The React app expects different table/column names — run migrate-to-app-schema.sql instead.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- See conversation / Supabase dashboard for full original DDL.
-- Key differences from app schema:
--   routes.route_name          → app uses routes.name
--   stages                     → app uses route_stages
--   fares                      → app uses stage_fares
--   wallet_transactions.type   → app column is "type" (yours: transaction_type)
--   payments.verification_status → app uses payments.status ('pending'|'verified'|...)
--   trips.start_time/end_time  → app uses started_at/ended_at
--   Missing: sacco_settings, RPCs (create_payment, topup_wallet, ...), RLS policies

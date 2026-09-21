-- Hot-path indexes for Smart Matatu (run once in Supabase SQL Editor)
-- Speeds up trip lookups, payment lists, assignments, and wallet history.

CREATE INDEX IF NOT EXISTS idx_trips_driver_status ON trips(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_route_status ON trips(route_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_status ON trips(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_sacco_status ON trips(sacco_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_passenger_status_created
  ON payments(passenger_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_trip_status ON payments(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_verified_by_at ON payments(verified_by, verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_vehicle_status ON payments(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_sacco_status_created
  ON payments(sacco_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_active
  ON driver_assignments(driver_id, is_active);

CREATE INDEX IF NOT EXISTS idx_route_stages_route ON route_stages(route_id);
CREATE INDEX IF NOT EXISTS idx_stage_fares_route ON stage_fares(route_id);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_created
  ON wallet_transactions(wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle ON vehicle_locations(vehicle_id);

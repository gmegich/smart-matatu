-- =============================================================================
-- Smart Matatu: align YOUR Supabase schema with the React/Express app
-- =============================================================================
-- Run this in Supabase SQL Editor on project wbvzyxkacxthxmcdmtoe (or your project)
-- Safe to re-run: uses IF NOT EXISTS / conditional renames where possible.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ROUTES: route_name → name, add is_active + description
-- -----------------------------------------------------------------------------
ALTER TABLE routes ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'routes' AND column_name = 'route_name'
  ) THEN
    UPDATE routes SET name = route_name WHERE name IS NULL AND route_name IS NOT NULL;
  END IF;
END $$;

UPDATE routes SET is_active = true WHERE is_active IS NULL;

-- -----------------------------------------------------------------------------
-- 2. STAGES → route_stages (rename table + columns)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'route_stages')
  THEN
    ALTER TABLE stages RENAME TO route_stages;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'route_stages' AND column_name = 'stage_name'
  ) THEN
    ALTER TABLE route_stages RENAME COLUMN stage_name TO name;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'route_stages' AND column_name = 'stage_order'
  ) THEN
    ALTER TABLE route_stages RENAME COLUMN stage_order TO order_index;
  END IF;
END $$;

ALTER TABLE route_stages ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE route_stages ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE route_stages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- 3. FARES → stage_fares (rename table + columns)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fares')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stage_fares')
  THEN
    ALTER TABLE fares RENAME TO stage_fares;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stage_fares' AND column_name = 'from_stage'
  ) THEN
    ALTER TABLE stage_fares RENAME COLUMN from_stage TO from_stage_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stage_fares' AND column_name = 'to_stage'
  ) THEN
    ALTER TABLE stage_fares RENAME COLUMN to_stage TO to_stage_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stage_fares' AND column_name = 'amount'
  ) THEN
    ALTER TABLE stage_fares RENAME COLUMN amount TO fare_amount;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. SACCO SETTINGS (owner earnings %)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sacco_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sacco_id UUID NOT NULL UNIQUE REFERENCES saccos(id) ON DELETE CASCADE,
  owner_earnings_percentage DECIMAL(5,2) DEFAULT 70.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sacco_settings (sacco_id, owner_earnings_percentage)
SELECT id, 70.00 FROM saccos
ON CONFLICT (sacco_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. WALLETS & TRANSACTIONS
-- -----------------------------------------------------------------------------
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE wallets SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'transaction_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'type'
  ) THEN
    ALTER TABLE wallet_transactions RENAME COLUMN transaction_type TO type;
  END IF;
END $$;

ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Relax / replace type check constraint (only if type column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'type'
  ) THEN
    ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;
    ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
    ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
      CHECK (type IN ('topup', 'payment', 'refund', 'credit', 'admin_credit', 'self_topup'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. TRIPS
-- -----------------------------------------------------------------------------
ALTER TABLE trips ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'start_time'
  ) THEN
    UPDATE trips SET started_at = start_time WHERE started_at IS NULL AND start_time IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'end_time'
  ) THEN
    UPDATE trips SET ended_at = end_time WHERE ended_at IS NULL AND end_time IS NOT NULL;
  END IF;
END $$;

UPDATE trips t
SET sacco_id = v.sacco_id
FROM vehicles v
WHERE t.vehicle_id = v.id AND t.sacco_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'created_at'
  ) THEN
    UPDATE trips SET started_at = COALESCE(started_at, created_at, NOW()) WHERE started_at IS NULL;
  ELSE
    UPDATE trips SET started_at = COALESCE(started_at, NOW()) WHERE started_at IS NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 7. VEHICLE LOCATIONS
-- -----------------------------------------------------------------------------
ALTER TABLE vehicle_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicle_locations' AND column_name = 'recorded_at'
  ) THEN
    UPDATE vehicle_locations SET updated_at = recorded_at WHERE updated_at IS NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8. DRIVER ASSIGNMENTS
-- -----------------------------------------------------------------------------
ALTER TABLE driver_assignments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE driver_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'driver_assignments' AND column_name = 'assigned_at'
  ) THEN
    UPDATE driver_assignments SET created_at = assigned_at WHERE created_at IS NULL;
  END IF;
END $$;

UPDATE driver_assignments SET is_active = true WHERE is_active IS NULL;

-- -----------------------------------------------------------------------------
-- 9. PAYMENTS (biggest gap)
-- -----------------------------------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS from_stage_id UUID REFERENCES route_stages(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS to_stage_id UUID REFERENCES route_stages(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES saccos(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'verification_status'
  ) THEN
    UPDATE payments SET status = CASE WHEN verification_status = true THEN 'verified' ELSE 'pending' END
    WHERE status IS NULL OR status = 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'paid_at'
  ) THEN
    UPDATE payments SET created_at = COALESCE(created_at, paid_at, NOW()) WHERE created_at IS NULL;
  ELSE
    UPDATE payments SET created_at = COALESCE(created_at, NOW()) WHERE created_at IS NULL;
  END IF;
END $$;
UPDATE payments p SET sacco_id = r.sacco_id FROM routes r WHERE p.route_id = r.id AND p.sacco_id IS NULL;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'verified', 'expired', 'cancelled'));

-- -----------------------------------------------------------------------------
-- 10. OWNER EARNINGS
-- -----------------------------------------------------------------------------
ALTER TABLE owner_earnings ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);
ALTER TABLE owner_earnings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2);
ALTER TABLE owner_earnings ADD COLUMN IF NOT EXISTS owner_share NUMERIC(10,2);
ALTER TABLE owner_earnings ADD COLUMN IF NOT EXISTS sacco_share NUMERIC(10,2);
ALTER TABLE owner_earnings ADD COLUMN IF NOT EXISTS owner_percentage NUMERIC(5,2);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'owner_earnings' AND column_name = 'amount'
  ) THEN
    UPDATE owner_earnings
    SET
      total_amount = COALESCE(total_amount, amount),
      owner_share = COALESCE(owner_share, amount),
      sacco_share = COALESCE(sacco_share, 0),
      owner_percentage = COALESCE(owner_percentage, 70)
    WHERE amount IS NOT NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 11. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_sacco_id()
RETURNS UUID AS $$
  SELECT sacco_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION generate_payment_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop old boolean verify_payment if present
DROP FUNCTION IF EXISTS verify_payment(VARCHAR);

CREATE OR REPLACE FUNCTION topup_wallet(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT DEFAULT 'admin_credit',
  p_description TEXT DEFAULT 'Wallet top-up'
)
RETURNS JSON AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_new_balance DECIMAL;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  v_new_balance := v_wallet.balance + p_amount;
  UPDATE wallets SET balance = v_new_balance, updated_at = NOW() WHERE id = v_wallet.id;

  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description)
  VALUES (v_wallet.id, p_type, p_amount, v_new_balance, p_description);

  RETURN json_build_object('success', true, 'balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_payment(
  p_route_id UUID,
  p_trip_id UUID,
  p_vehicle_id UUID,
  p_from_stage_id UUID,
  p_to_stage_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_fare DECIMAL;
  v_wallet wallets%ROWTYPE;
  v_code TEXT;
  v_payment_id UUID;
  v_sacco_id UUID;
BEGIN
  SELECT fare_amount INTO v_fare FROM stage_fares
  WHERE route_id = p_route_id AND from_stage_id = p_from_stage_id AND to_stage_id = p_to_stage_id;

  IF v_fare IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fare not found for selected stages');
  END IF;

  IF p_trip_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM trips WHERE id = p_trip_id AND is_full = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Matatu is full — gari limejaa');
  END IF;

  SELECT sacco_id INTO v_sacco_id FROM routes WHERE id = p_route_id;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_wallet.balance < v_fare THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  v_code := generate_payment_code();
  WHILE EXISTS (SELECT 1 FROM payments WHERE payment_code = v_code) LOOP
    v_code := generate_payment_code();
  END LOOP;

  UPDATE wallets SET balance = balance - v_fare, updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO payments (
    passenger_id, trip_id, route_id, vehicle_id,
    from_stage_id, to_stage_id, amount, payment_code, sacco_id, status, created_at
  ) VALUES (
    auth.uid(), p_trip_id, p_route_id, p_vehicle_id,
    p_from_stage_id, p_to_stage_id, v_fare, v_code, v_sacco_id, 'pending', NOW()
  ) RETURNING id INTO v_payment_id;

  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, reference_id)
  VALUES (v_wallet.id, 'payment', v_fare, v_wallet.balance - v_fare,
    'Fare payment - ' || v_code, v_payment_id);

  RETURN json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'payment_code', v_code,
    'amount', v_fare,
    'balance', v_wallet.balance - v_fare
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION verify_payment(p_payment_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_owner_pct DECIMAL;
  v_owner_share DECIMAL;
  v_sacco_share DECIMAL;
  v_owner_id UUID;
BEGIN
  SELECT * INTO v_payment FROM payments
  WHERE payment_code = upper(trim(p_payment_code)) AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or already verified payment code');
  END IF;

  IF v_payment.expires_at IS NOT NULL AND v_payment.expires_at < NOW() THEN
    UPDATE payments SET status = 'expired' WHERE id = v_payment.id;
    RETURN json_build_object('success', false, 'error', 'Payment code has expired');
  END IF;

  UPDATE payments SET
    status = 'verified',
    verified_by = auth.uid(),
    verified_at = NOW()
  WHERE id = v_payment.id;

  SELECT owner_earnings_percentage INTO v_owner_pct
  FROM sacco_settings WHERE sacco_id = v_payment.sacco_id;
  v_owner_pct := COALESCE(v_owner_pct, 70);

  SELECT owner_id INTO v_owner_id FROM vehicles WHERE id = v_payment.vehicle_id;
  v_owner_share := ROUND(v_payment.amount * v_owner_pct / 100, 2);
  v_sacco_share := v_payment.amount - v_owner_share;

  IF v_owner_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'owner_earnings' AND column_name = 'amount'
    ) THEN
      INSERT INTO owner_earnings (
        owner_id, vehicle_id, payment_id, total_amount,
        owner_share, sacco_share, owner_percentage, amount
      ) VALUES (
        v_owner_id, v_payment.vehicle_id, v_payment.id, v_payment.amount,
        v_owner_share, v_sacco_share, v_owner_pct, v_owner_share
      );
    ELSE
      INSERT INTO owner_earnings (
        owner_id, vehicle_id, payment_id, total_amount,
        owner_share, sacco_share, owner_percentage
      ) VALUES (
        v_owner_id, v_payment.vehicle_id, v_payment.id, v_payment.amount,
        v_owner_share, v_sacco_share, v_owner_pct
      );
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'payment_id', v_payment.id, 'amount', v_payment.amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION start_trip(p_vehicle_id UUID, p_route_id UUID)
RETURNS JSON AS $$
DECLARE
  v_trip_id UUID;
  v_sacco_id UUID;
BEGIN
  SELECT sacco_id INTO v_sacco_id FROM vehicles WHERE id = p_vehicle_id;

  INSERT INTO trips (vehicle_id, driver_id, route_id, sacco_id, status, started_at)
  VALUES (p_vehicle_id, auth.uid(), p_route_id, v_sacco_id, 'active', NOW())
  RETURNING id INTO v_trip_id;

  RETURN json_build_object('success', true, 'trip_id', v_trip_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION end_trip(p_trip_id UUID)
RETURNS JSON AS $$
BEGIN
  UPDATE trips SET status = 'completed', ended_at = NOW()
  WHERE id = p_trip_id AND driver_id = auth.uid() AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found or already ended');
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION upsert_vehicle_location(
  p_vehicle_id UUID,
  p_trip_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM vehicle_locations WHERE vehicle_id = p_vehicle_id;
  INSERT INTO vehicle_locations (vehicle_id, trip_id, latitude, longitude, updated_at)
  VALUES (p_vehicle_id, p_trip_id, p_latitude, p_longitude, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE saccos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacco_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_fares ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saccos_select" ON saccos;
CREATE POLICY "saccos_select" ON saccos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (get_user_role() = 'admin' AND sacco_id = get_user_sacco_id()));

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "routes_select" ON routes;
CREATE POLICY "routes_select" ON routes FOR SELECT TO authenticated USING (
  is_active = true OR (sacco_id = get_user_sacco_id() AND get_user_role() IN ('admin', 'driver', 'owner'))
);

DROP POLICY IF EXISTS "routes_admin" ON routes;
CREATE POLICY "routes_admin" ON routes FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND sacco_id = get_user_sacco_id());

DROP POLICY IF EXISTS "stages_select" ON route_stages;
CREATE POLICY "stages_select" ON route_stages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stages_admin" ON route_stages;
CREATE POLICY "stages_admin" ON route_stages FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND route_id IN (SELECT id FROM routes WHERE sacco_id = get_user_sacco_id()));

DROP POLICY IF EXISTS "fares_select" ON stage_fares;
CREATE POLICY "fares_select" ON stage_fares FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "fares_admin" ON stage_fares;
CREATE POLICY "fares_admin" ON stage_fares FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND route_id IN (SELECT id FROM routes WHERE sacco_id = get_user_sacco_id()));

DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT TO authenticated USING (
  sacco_id = get_user_sacco_id() OR get_user_role() = 'passenger'
);

DROP POLICY IF EXISTS "vehicles_admin" ON vehicles;
CREATE POLICY "vehicles_admin" ON vehicles FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND sacco_id = get_user_sacco_id());

DROP POLICY IF EXISTS "vehicles_owner" ON vehicles;
CREATE POLICY "vehicles_owner" ON vehicles FOR SELECT TO authenticated
  USING (get_user_role() = 'owner' AND owner_id = auth.uid());

DROP POLICY IF EXISTS "assignments_select" ON driver_assignments;
CREATE POLICY "assignments_select" ON driver_assignments FOR SELECT TO authenticated USING (
  driver_id = auth.uid() OR get_user_role() IN ('admin', 'driver')
);

DROP POLICY IF EXISTS "assignments_admin" ON driver_assignments;
CREATE POLICY "assignments_admin" ON driver_assignments FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "wallets_own" ON wallets;
CREATE POLICY "wallets_own" ON wallets FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wallets_admin" ON wallets;
CREATE POLICY "wallets_admin" ON wallets FOR SELECT TO authenticated USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "transactions_own" ON wallet_transactions;
CREATE POLICY "transactions_own" ON wallet_transactions FOR SELECT TO authenticated
  USING (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "trips_select" ON trips;
CREATE POLICY "trips_select" ON trips FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trips_driver" ON trips;
CREATE POLICY "trips_driver" ON trips FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'driver' AND driver_id = auth.uid());

DROP POLICY IF EXISTS "trips_driver_update" ON trips;
CREATE POLICY "trips_driver_update" ON trips FOR UPDATE TO authenticated USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "locations_select" ON vehicle_locations;
CREATE POLICY "locations_select" ON vehicle_locations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "locations_driver" ON vehicle_locations;
CREATE POLICY "locations_driver" ON vehicle_locations FOR ALL TO authenticated
  USING (get_user_role() = 'driver');

DROP POLICY IF EXISTS "payments_own" ON payments;
CREATE POLICY "payments_own" ON payments FOR SELECT TO authenticated
  USING (passenger_id = auth.uid() OR get_user_role() IN ('driver', 'admin'));

DROP POLICY IF EXISTS "earnings_owner" ON owner_earnings;
CREATE POLICY "earnings_owner" ON owner_earnings FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS "settings_select" ON sacco_settings;
CREATE POLICY "settings_select" ON sacco_settings FOR SELECT TO authenticated USING (true);

-- Realtime (ignore errors if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE trips;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_locations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE payments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Done
SELECT 'Migration complete — app tables, RPCs, and RLS are aligned.' AS message;

ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_full BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION set_trip_full(p_is_full BOOLEAN)
RETURNS JSON AS $$
DECLARE
  v_trip trips%ROWTYPE;
BEGIN
  UPDATE trips SET is_full = COALESCE(p_is_full, false)
  WHERE driver_id = auth.uid() AND status = 'active'
  RETURNING * INTO v_trip;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No active trip found');
  END IF;

  RETURN json_build_object('success', true, 'trip_id', v_trip.id, 'is_full', v_trip.is_full);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate create_payment with full-matatu check (run full migrate block above if needed)

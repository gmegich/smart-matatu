-- =============================================================================
-- Smart Matatu — Full database schema
-- Run in Supabase SQL Editor (schema only; use seed.sql or setup-all.sql for data)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS saccos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sacco_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sacco_id UUID NOT NULL UNIQUE REFERENCES saccos(id) ON DELETE CASCADE,
  owner_earnings_percentage DECIMAL(5,2) DEFAULT 70.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'admin', 'owner')),
  sacco_id UUID REFERENCES saccos(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, order_index)
);

CREATE TABLE IF NOT EXISTS stage_fares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  from_stage_id UUID NOT NULL REFERENCES route_stages(id) ON DELETE CASCADE,
  to_stage_id UUID NOT NULL REFERENCES route_stages(id) ON DELETE CASCADE,
  fare_amount DECIMAL(10,2) NOT NULL CHECK (fare_amount > 0),
  UNIQUE(route_id, from_stage_id, to_stage_id)
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES profiles(id),
  plate_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 14,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sacco_id, plate_number)
);

CREATE TABLE IF NOT EXISTS driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('topup', 'payment', 'refund', 'credit', 'admin_credit', 'self_topup')),
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_id UUID NOT NULL REFERENCES profiles(id),
  route_id UUID NOT NULL REFERENCES routes(id),
  sacco_id UUID NOT NULL REFERENCES saccos(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  is_full BOOLEAN DEFAULT false,
  direction TEXT NOT NULL DEFAULT 'forward' CHECK (direction IN ('forward', 'return')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES profiles(id),
  trip_id UUID REFERENCES trips(id),
  route_id UUID NOT NULL REFERENCES routes(id),
  vehicle_id UUID REFERENCES vehicles(id),
  from_stage_id UUID NOT NULL REFERENCES route_stages(id),
  to_stage_id UUID NOT NULL REFERENCES route_stages(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'completed', 'expired', 'cancelled')),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  sacco_id UUID NOT NULL REFERENCES saccos(id),
  paid_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours')
);

CREATE TABLE IF NOT EXISTS owner_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  total_amount DECIMAL(10,2) NOT NULL,
  owner_share DECIMAL(10,2) NOT NULL,
  sacco_share DECIMAL(10,2) NOT NULL,
  owner_percentage DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'eta_2min',
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id, notification_type)
);

CREATE TABLE IF NOT EXISTS trip_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_sacco ON profiles(sacco_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_sacco ON trips(sacco_id);
CREATE INDEX IF NOT EXISTS idx_payments_code ON payments(payment_code);
CREATE INDEX IF NOT EXISTS idx_payments_passenger ON payments(passenger_id);
CREATE INDEX IF NOT EXISTS idx_payments_sacco ON payments(sacco_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle ON vehicle_locations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_payment ON sms_notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_trip_ratings_driver ON trip_ratings(driver_id);

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_sacco_id()
RETURNS UUID AS $$
  SELECT sacco_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'passenger')
  );
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'passenger') = 'passenger' THEN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION generate_payment_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql SET search_path = public;

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

  -- Fares are symmetric: fall back to the reverse direction (e.g. CBD->Lanet == Lanet->CBD)
  IF v_fare IS NULL THEN
    SELECT fare_amount INTO v_fare FROM stage_fares
    WHERE route_id = p_route_id AND from_stage_id = p_to_stage_id AND to_stage_id = p_from_stage_id;
  END IF;

  IF v_fare IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fare not found for selected stages');
  END IF;

  IF p_trip_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM trips WHERE id = p_trip_id AND is_full = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Matatu is full — gari limejaa');
  END IF;

  IF p_vehicle_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM trips WHERE vehicle_id = p_vehicle_id AND status = 'active' AND is_full = true
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
    from_stage_id, to_stage_id, amount, payment_code, sacco_id, status, paid_at
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

DROP FUNCTION IF EXISTS verify_payment(VARCHAR);

CREATE OR REPLACE FUNCTION verify_payment(p_payment_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_owner_pct DECIMAL;
  v_owner_share DECIMAL;
  v_sacco_share DECIMAL;
  v_owner_id UUID;
  v_trip_id UUID;
  v_vehicle_id UUID;
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

  -- The driver verifying the code is the one collecting the fare: attribute the
  -- payment to their active trip + vehicle so driver collections and owner
  -- earnings are credited correctly.
  SELECT id, vehicle_id INTO v_trip_id, v_vehicle_id
  FROM trips
  WHERE driver_id = auth.uid() AND status = 'active'
  ORDER BY started_at DESC
  LIMIT 1;

  v_trip_id := COALESCE(v_trip_id, v_payment.trip_id);
  v_vehicle_id := COALESCE(v_vehicle_id, v_payment.vehicle_id);

  UPDATE payments SET
    status = 'verified',
    verified_by = auth.uid(),
    verified_at = NOW(),
    trip_id = v_trip_id,
    vehicle_id = v_vehicle_id
  WHERE id = v_payment.id;

  SELECT owner_earnings_percentage INTO v_owner_pct
  FROM sacco_settings WHERE sacco_id = v_payment.sacco_id;
  v_owner_pct := COALESCE(v_owner_pct, 70);

  SELECT owner_id INTO v_owner_id FROM vehicles WHERE id = v_vehicle_id;
  v_owner_share := ROUND(v_payment.amount * v_owner_pct / 100, 2);
  v_sacco_share := v_payment.amount - v_owner_share;

  IF v_owner_id IS NOT NULL THEN
    INSERT INTO owner_earnings (
      owner_id, vehicle_id, payment_id, total_amount,
      owner_share, sacco_share, owner_percentage
    ) VALUES (
      v_owner_id, v_vehicle_id, v_payment.id, v_payment.amount,
      v_owner_share, v_sacco_share, v_owner_pct
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'amount', v_payment.amount,
    'owner_share', v_owner_share,
    'sacco_share', v_sacco_share,
    'owner_percentage', v_owner_pct
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS start_trip(UUID, UUID);

CREATE OR REPLACE FUNCTION start_trip(p_vehicle_id UUID, p_route_id UUID, p_direction TEXT DEFAULT 'forward')
RETURNS JSON AS $$
DECLARE
  v_trip_id UUID;
  v_sacco_id UUID;
BEGIN
  SELECT sacco_id INTO v_sacco_id FROM vehicles WHERE id = p_vehicle_id;

  INSERT INTO trips (vehicle_id, driver_id, route_id, sacco_id, status, is_full, direction, started_at)
  VALUES (p_vehicle_id, auth.uid(), p_route_id, v_sacco_id, 'active', false,
    CASE WHEN p_direction = 'return' THEN 'return' ELSE 'forward' END, NOW())
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

CREATE OR REPLACE FUNCTION passenger_arrive(p_payment_id UUID)
RETURNS JSON AS $$
DECLARE
  v_payment payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM payments
  WHERE id = p_payment_id AND passenger_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.status = 'completed' AND v_payment.arrived_at IS NOT NULL THEN
    RETURN json_build_object('success', true, 'already_arrived', true, 'arrived_at', v_payment.arrived_at);
  END IF;

  IF v_payment.status != 'verified' THEN
    RETURN json_build_object('success', false, 'error', 'Payment must be verified by driver first');
  END IF;

  UPDATE payments SET arrived_at = NOW(), status = 'completed' WHERE id = p_payment_id;

  RETURN json_build_object('success', true, 'payment_id', p_payment_id, 'status', 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION rate_trip(p_payment_id UUID, p_rating INTEGER, p_comment TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_rating_id UUID;
  v_driver_id UUID;
BEGIN
  IF p_rating IS NULL OR p_rating < 0 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'Rating must be between 0 and 5');
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id AND passenger_id = auth.uid();
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.arrived_at IS NULL AND v_payment.status = 'verified' THEN
    UPDATE payments SET arrived_at = NOW(), status = 'completed' WHERE id = p_payment_id;
    v_payment.arrived_at := NOW();
    v_payment.status := 'completed';
  ELSIF v_payment.arrived_at IS NULL AND v_payment.status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Mark arrived before rating');
  END IF;

  IF EXISTS (SELECT 1 FROM trip_ratings WHERE payment_id = p_payment_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already rated this trip');
  END IF;

  IF v_payment.trip_id IS NOT NULL THEN
    SELECT driver_id INTO v_driver_id FROM trips WHERE id = v_payment.trip_id;
  END IF;

  INSERT INTO trip_ratings (payment_id, trip_id, passenger_id, driver_id, rating, comment)
  VALUES (p_payment_id, v_payment.trip_id, auth.uid(), v_driver_id, p_rating, NULLIF(trim(p_comment), ''))
  RETURNING id INTO v_rating_id;

  RETURN json_build_object('success', true, 'rating_id', v_rating_id, 'rating', p_rating);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- Row Level Security
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
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saccos_select" ON saccos;
CREATE POLICY "saccos_select" ON saccos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "saccos_admin" ON saccos;
CREATE POLICY "saccos_admin" ON saccos FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND id = get_user_sacco_id());

DROP POLICY IF EXISTS "settings_select" ON sacco_settings;
CREATE POLICY "settings_select" ON sacco_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_admin" ON sacco_settings;
CREATE POLICY "settings_admin" ON sacco_settings FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND sacco_id = get_user_sacco_id());

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (get_user_role() = 'admin' AND (sacco_id = get_user_sacco_id() OR role = 'passenger'))
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_insert" ON profiles;
CREATE POLICY "profiles_admin_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin' AND sacco_id = get_user_sacco_id());

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

DROP POLICY IF EXISTS "transactions_admin" ON wallet_transactions;
CREATE POLICY "transactions_admin" ON wallet_transactions FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

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

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated
  WITH CHECK (passenger_id = auth.uid());

DROP POLICY IF EXISTS "earnings_owner" ON owner_earnings;
CREATE POLICY "earnings_owner" ON owner_earnings FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS "sms_own" ON sms_notifications;
CREATE POLICY "sms_own" ON sms_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ratings_own" ON trip_ratings;
CREATE POLICY "ratings_own" ON trip_ratings FOR SELECT TO authenticated
  USING (passenger_id = auth.uid() OR driver_id = auth.uid() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS "ratings_insert_own" ON trip_ratings;
CREATE POLICY "ratings_insert_own" ON trip_ratings FOR INSERT TO authenticated
  WITH CHECK (passenger_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Realtime publication
-- -----------------------------------------------------------------------------

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

SELECT 'Schema complete — tables, functions, RLS, and realtime are ready.' AS message;

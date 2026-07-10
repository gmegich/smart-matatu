-- Add matatu full status for active trips
-- Run in Supabase SQL Editor

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

-- Block fare payment when passenger selects a full matatu
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

SELECT 'trips.is_full, set_trip_full(), and create_payment full-check ready' AS message;

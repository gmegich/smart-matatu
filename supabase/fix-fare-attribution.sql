-- Fix: fares not updating for driver collections and owner earnings.
-- The driver who verifies the payment code is the one collecting the fare, so we
-- attribute the payment to THEIR active trip + vehicle at verification time.
-- This ensures the driver's "Safari Hii" total and the owner's earnings update.
-- Run in Supabase SQL Editor.

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

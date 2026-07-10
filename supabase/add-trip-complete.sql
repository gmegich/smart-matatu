-- Passenger trip completion (arrive at destination)
-- Run in Supabase SQL Editor

ALTER TABLE payments ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'verified', 'completed', 'expired', 'cancelled'));

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
    RETURN json_build_object(
      'success', true,
      'already_arrived', true,
      'arrived_at', v_payment.arrived_at,
      'payment_id', v_payment.id
    );
  END IF;

  IF v_payment.status != 'verified' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Malipo lazima yathibitishwe na dereva kwanza / Payment must be verified by driver first'
    );
  END IF;

  UPDATE payments SET arrived_at = NOW(), status = 'completed'
  WHERE id = p_payment_id;

  RETURN json_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'arrived_at', NOW(),
    'status', 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

SELECT 'passenger_arrive() ready' AS message;

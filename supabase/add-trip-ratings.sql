-- Passenger arrive + trip ratings
-- Run in Supabase SQL Editor

ALTER TABLE payments ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'verified', 'completed', 'expired', 'cancelled'));

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

CREATE INDEX IF NOT EXISTS idx_trip_ratings_driver ON trip_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_ratings_trip ON trip_ratings(trip_id);

-- Allow 0–5 stars if table was created with 1–5 only
ALTER TABLE trip_ratings DROP CONSTRAINT IF EXISTS trip_ratings_rating_check;
ALTER TABLE trip_ratings ADD CONSTRAINT trip_ratings_rating_check CHECK (rating >= 0 AND rating <= 5);

ALTER TABLE trip_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_own" ON trip_ratings;
CREATE POLICY "ratings_own" ON trip_ratings FOR SELECT TO authenticated
  USING (
    passenger_id = auth.uid()
    OR driver_id = auth.uid()
    OR get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "ratings_insert_own" ON trip_ratings;
CREATE POLICY "ratings_insert_own" ON trip_ratings FOR INSERT TO authenticated
  WITH CHECK (passenger_id = auth.uid());

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

CREATE OR REPLACE FUNCTION rate_trip(
  p_payment_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_rating_id UUID;
  v_driver_id UUID;
BEGIN
  IF p_rating IS NULL OR p_rating < 0 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'Rating must be between 0 and 5');
  END IF;

  SELECT * INTO v_payment FROM payments
  WHERE id = p_payment_id AND passenger_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.arrived_at IS NULL AND v_payment.status = 'verified' THEN
    UPDATE payments SET arrived_at = NOW(), status = 'completed' WHERE id = p_payment_id;
    v_payment.arrived_at := NOW();
    v_payment.status := 'completed';
  ELSIF v_payment.arrived_at IS NULL AND v_payment.status != 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Thibitisha umefika kwanza / Mark arrived before rating'
    );
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

  RETURN json_build_object(
    'success', true,
    'rating_id', v_rating_id,
    'rating', p_rating
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

SELECT 'passenger_arrive() and rate_trip() ready' AS message;

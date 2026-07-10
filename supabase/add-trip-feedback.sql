-- =============================================================================
-- Smart Matatu: trip completion + passenger feedback (run once in SQL Editor)
-- Fixes: "Feedback table missing" and "arrived_at does not exist"
-- =============================================================================

-- 1) Trip completion columns on payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'verified', 'completed', 'expired', 'cancelled'));

-- 2) Helper for RLS (skip error if you already have this from schema.sql)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 3) Feedback / ratings table
CREATE TABLE IF NOT EXISTS trip_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_ratings_driver ON trip_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_ratings_trip ON trip_ratings(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_ratings_passenger ON trip_ratings(passenger_id);

ALTER TABLE trip_ratings DROP CONSTRAINT IF EXISTS trip_ratings_rating_check;
ALTER TABLE trip_ratings ADD CONSTRAINT trip_ratings_rating_check CHECK (rating >= 1 AND rating <= 5);

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

-- 4) Mark trip as arrived (passenger)
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

  IF v_payment.status = 'completed' THEN
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

-- 5) Submit rating (0–5) + feedback comment
CREATE OR REPLACE FUNCTION submit_trip_feedback(
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
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'Rating must be between 1 and 5');
  END IF;

  SELECT * INTO v_payment FROM payments
  WHERE id = p_payment_id AND passenger_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.status = 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Wait for driver to verify payment first');
  END IF;

  IF v_payment.status = 'verified' THEN
    UPDATE payments SET arrived_at = NOW(), status = 'completed' WHERE id = p_payment_id;
    v_payment.status := 'completed';
    v_payment.arrived_at := NOW();
  ELSIF v_payment.status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Trip must be verified or completed before feedback');
  END IF;

  IF EXISTS (SELECT 1 FROM trip_ratings WHERE payment_id = p_payment_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already submitted feedback for this trip');
  END IF;

  IF v_payment.trip_id IS NOT NULL THEN
    SELECT driver_id INTO v_driver_id FROM trips WHERE id = v_payment.trip_id;
  END IF;

  INSERT INTO trip_ratings (payment_id, trip_id, passenger_id, driver_id, rating, comment)
  VALUES (
    p_payment_id,
    v_payment.trip_id,
    auth.uid(),
    v_driver_id,
    p_rating,
    NULLIF(trim(p_comment), '')
  )
  RETURNING id INTO v_rating_id;

  RETURN json_build_object(
    'success', true,
    'rating_id', v_rating_id,
    'rating', p_rating,
    'status', 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Done
SELECT 'OK — trip_ratings, passenger_arrive(), submit_trip_feedback() ready' AS message;

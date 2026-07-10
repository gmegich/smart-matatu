-- Allow drivers to start a return trip (e.g. Njoro -> Nakuru CBD).
-- Adds a direction to trips and lets start_trip accept it.
-- Run in Supabase SQL Editor.

-- Ensure required columns exist (older databases may be missing them)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_full BOOLEAN DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'forward';

ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_direction_check;
ALTER TABLE trips ADD CONSTRAINT trips_direction_check
  CHECK (direction IN ('forward', 'return'));

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

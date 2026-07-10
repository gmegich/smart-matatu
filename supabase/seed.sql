-- =============================================================================
-- Smart Matatu — Nakuru sample data
-- Run AFTER schema.sql (or use setup-all.sql for one-shot setup)
-- =============================================================================

-- SACCOs
INSERT INTO saccos (id, name, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Nakuru Express SACCO', 'Premium matatu services in Nakuru County'),
  ('a0000000-0000-0000-0000-000000000002', 'Rift Valley Travellers', 'Serving Nakuru and Rift Valley routes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sacco_settings (sacco_id, owner_earnings_percentage) VALUES
  ('a0000000-0000-0000-0000-000000000001', 70.00),
  ('a0000000-0000-0000-0000-000000000002', 65.00)
ON CONFLICT (sacco_id) DO NOTHING;

-- Routes for Nakuru Express (first SACCO)
INSERT INTO routes (id, sacco_id, name, description) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'CBD - Lanet', 'Nakuru CBD to Lanet via Kiamunyi'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'CBD - Njoro', 'Nakuru CBD to Njoro town')
ON CONFLICT (id) DO NOTHING;

-- Stages: CBD - Lanet (Nakuru coords approx -0.3031, 36.0800)
INSERT INTO route_stages (id, route_id, name, order_index, latitude, longitude) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Nakuru CBD', 1, -0.303100, 36.080000),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Kiamunyi', 2, -0.285000, 36.065000),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Lanet', 3, -0.265000, 36.050000)
ON CONFLICT (id) DO NOTHING;

-- Stages: CBD - Njoro
INSERT INTO route_stages (id, route_id, name, order_index, latitude, longitude) VALUES
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'Nakuru CBD', 1, -0.303100, 36.080000),
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000002', 'Ngata', 2, -0.320000, 36.090000),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000002', 'Njoro', 3, -0.340000, 35.950000)
ON CONFLICT (id) DO NOTHING;

-- Fares: CBD - Lanet (KES)
INSERT INTO stage_fares (route_id, from_stage_id, to_stage_id, fare_amount) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 30),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 50),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 30)
ON CONFLICT (route_id, from_stage_id, to_stage_id) DO NOTHING;

-- Fares: CBD - Njoro
INSERT INTO stage_fares (route_id, from_stage_id, to_stage_id, fare_amount) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000011', 40),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000012', 80),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000012', 50)
ON CONFLICT (route_id, from_stage_id, to_stage_id) DO NOTHING;

-- After creating staff via Auth, assign roles in SQL, e.g.:
-- UPDATE profiles SET role = 'admin', sacco_id = 'a0000000-0000-0000-0000-000000000001' WHERE email = 'admin@nakuru.com';

SELECT 'Seed complete — Nakuru SACCOs, routes, stages, and fares loaded.' AS message;

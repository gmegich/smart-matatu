-- Demo Driver / Dereva setup (run AFTER creating the auth user)
--
-- 1. Create driver account (from project root):
--    cd frontend && npm run create-user -- driver@nakuru.com pass123 "John Dereva" driver a0000000-0000-0000-0000-000000000001
--
-- 2. Then run this SQL to assign vehicle + route:

INSERT INTO vehicles (id, sacco_id, plate_number, capacity, status)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'KCA 123A',
  14,
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO driver_assignments (driver_id, vehicle_id, route_id, is_active)
SELECT
  p.id,
  'd0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  true
FROM profiles p
WHERE p.email = 'driver@nakuru.com'
ON CONFLICT DO NOTHING;

SELECT 'Demo driver ready — login at /login → Driver / Dereva → driver@nakuru.com / pass123' AS message;

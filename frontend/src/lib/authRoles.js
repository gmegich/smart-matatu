export const AUTH_ROLES = [
  {
    id: 'passenger',
    label: 'Passenger / Abiria',
    icon: '👤',
    hint: 'Pay fare, track matatu, wallet',
  },
  {
    id: 'driver',
    label: 'Driver / Dereva',
    icon: '🚗',
    hint: 'Start trips, verify payments, GPS tracking',
    demo: { email: 'driver@nakuru.com', password: 'pass123' },
  },
  {
    id: 'owner',
    label: 'Owner / Mmiliki',
    icon: '🚌',
    hint: 'Track your cars, earnings & trips',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '⚙️',
    hint: 'Manage routes, vehicles, users',
    demo: { email: 'admin@nakuru.com', password: 'pass123' },
  },
]

/** Roles allowed on the public registration page (admin & owner are admin-created only). */
export const PUBLIC_REGISTER_ROLES = AUTH_ROLES.filter((r) =>
  ['passenger', 'driver'].includes(r.id)
)

export const ROLE_HOME = {
  passenger: '/passenger',
  driver: '/driver',
  admin: '/admin',
  owner: '/owner',
}

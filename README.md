# Smart Matatu — Fare Collection & Vehicle Tracking System

A full-stack web application for public transport (matatu) management in Nakuru, Kenya. Built with **React**, **Tailwind CSS**, **Leaflet/OpenStreetMap**, and **Supabase**.

> **Full documentation:** see [PROJECT.md](./PROJECT.md) for architecture, API reference, database design, setup guide, and troubleshooting.

## Features

| Module | Capabilities |
|--------|-------------|
| **Passenger (Abiria)** | Register/login, view routes & stage fares, pay fare via wallet (QR code), track paid matatu, wallet top-up (simulated), trip history |
| **Driver (Dereva)** | Start/end trips, GPS tracking (~10s), verify passenger payment codes, view assigned routes |
| **Admin (SACCO)** | Multi-SACCO dashboard, manage users/vehicles/routes/fares, credit wallets, monitor trips, analytics charts |
| **Vehicle Owner** | View vehicles, track location, earnings (percentage share per verified payment) |

## Tech Stack

- **Frontend:** React 19, Vite, React Router, Tailwind CSS 4, Axios, Leaflet, Recharts, QRCode
- **Backend API:** Node.js, Express (REST API)
- **Database:** Supabase (PostgreSQL, Auth, Realtime, RLS)

## Setup

### 0. Supabase project (this repo)

| Setting | Value |
|---------|--------|
| **Project URL** | `https://wbvzyxkacxthxmcdmtoe.supabase.co` |
| **Project ref** | `wbvzyxkacxthxmcdmtoe` |
| **Publishable key** | `sb_publishable__G8fU807FX-LWjlxRyGwGA_DkAd1Z_Z` |
| **Database URL** | `postgresql://postgres:[YOUR-PASSWORD]@db.wbvzyxkacxthxmcdmtoe.supabase.co:5432/postgres` |

**Supabase CLI** (optional, from project root):

```bash
supabase login
supabase init          # skip if supabase/config.toml already exists
supabase link --project-ref wbvzyxkacxthxmcdmtoe
```

Add your **secret key** to `backend/.env` as `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API).

### 1. Supabase Database

**If you already ran a different schema** (e.g. `stages`, `fares`, `route_name`, `verification_status`):

1. Open **SQL Editor** → run **`supabase/migrate-to-app-schema.sql`** (aligns your DB with this app)
2. Optionally run **`supabase/seed.sql`** for Nakuru sample routes

**Fresh Supabase project:**

1. Run **`supabase/setup-all.sql`** (or `schema.sql` then `seed.sql`)
2. Or from `backend/`: set `DATABASE_URL` in `.env` and run `npm run setup:db`

### 2. Supabase Auth

In **Authentication → Providers**, enable **Email** provider.

Optional: disable email confirmation for local dev under **Authentication → Settings**.

### 3. Enable Realtime

In **Database → Replication**, ensure these tables are enabled for Realtime:
- `trips`
- `vehicle_locations`
- `payments`
- `wallets`

### 4. Backend API

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```
PORT=5000
SUPABASE_URL=https://wbvzyxkacxthxmcdmtoe.supabase.co
SUPABASE_ANON_KEY=sb_publishable__G8fU807FX-LWjlxRyGwGA_DkAd1Z_Z
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # server only — never put in frontend
CLIENT_URL=http://localhost:5173
```

```bash
npm install
npm run dev
```

API runs at http://localhost:5000 — health check: `GET /api/health`

### 5. Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://wbvzyxkacxthxmcdmtoe.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable__G8fU807FX-LWjlxRyGwGA_DkAd1Z_Z
VITE_API_URL=http://localhost:5000/api
```

```bash
npm install
npm run dev
```

Open http://localhost:5173

**Registration & login** go through the backend API (no confirmation emails, no rate limit issues).

### 6. Create Staff Accounts

**Passengers** self-register at `/register` (via backend — no email sent).

For **admin, driver, owner** — use Admin UI after first admin exists, or create via API:

```bash
curl -X POST http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nakuru.com","password":"pass123","full_name":"Admin","role":"admin"}'
```

Or update profile in SQL Editor:

```sql
-- Admin for Nakuru Express SACCO
UPDATE profiles
SET role = 'admin', sacco_id = 'a0000000-0000-0000-0000-000000000001'
WHERE email = 'admin@nakuru.com';

-- Driver
UPDATE profiles
SET role = 'driver', sacco_id = 'a0000000-0000-0000-0000-000000000001'
WHERE email = 'driver@nakuru.com';

-- Vehicle Owner
UPDATE profiles
SET role = 'owner', sacco_id = 'a0000000-0000-0000-0000-000000000001'
WHERE email = 'owner@nakuru.com';
```

3. Add a vehicle and assign driver (via Admin UI or SQL):

```sql
INSERT INTO vehicles (sacco_id, owner_id, plate_number, capacity)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  (SELECT id FROM profiles WHERE email = 'owner@nakuru.com'),
  'KCA 123A', 14;

INSERT INTO driver_assignments (driver_id, vehicle_id, route_id)
SELECT
  (SELECT id FROM profiles WHERE email = 'driver@nakuru.com'),
  (SELECT id FROM vehicles WHERE plate_number = 'KCA 123A'),
  'b0000000-0000-0000-0000-000000000001';
```

## Payment Flow

1. **Passenger** tops up wallet (self-simulated or admin credit)
2. Passenger selects route, active matatu, from/to stages → pays → receives **QR code + payment code**
3. **Driver** verifies code before boarding
4. On verification, **owner earnings** are calculated (default 70% owner / 30% SACCO)

## Sample Nakuru Routes

| Route | Stages | Sample Fare |
|-------|--------|-------------|
| CBD → Lanet | CBD, Kiamunyi, Lanet | KES 30–50 |
| CBD → Njoro | CBD, Ngata, Njoro | KES 40–80 |
| CBD → Naivasha | CBD, Mbaruk, Naivasha | KES 50–150 |
| CBD → Bahati | CBD, Bahati | KES 60 |
| CBD → Gilgil | CBD, Gilgil | KES 100 |

## Project Structure

```
smart matatu/
├── backend/           # Express REST API
│   └── src/
│       ├── routes/    # auth, wallets, payments, trips, admin...
│       └── middleware/
├── frontend/          # React application
│   └── src/
│       ├── pages/     # Role-based pages
│       ├── components/
│       ├── context/   # Auth context
│       └── lib/       # Supabase client + API client
└── supabase/
    ├── schema.sql     # Database schema + RLS
    └── seed.sql       # Sample data
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register passenger (no email) |
| POST | `/api/auth/login` | Login |
| GET | `/api/profile/me` | Current user profile |
| GET | `/api/wallets/me` | Wallet balance |
| POST | `/api/wallets/topup` | Self top-up |
| POST | `/api/payments` | Create payment |
| POST | `/api/payments/verify` | Driver verify code |
| POST | `/api/trips/start` | Start trip |
| POST | `/api/trips/end` | End trip |
| POST | `/api/trips/location` | Update GPS |
| GET | `/api/routes` | List routes |
| GET | `/api/admin/analytics` | Dashboard stats |

## Security

- Express API with JWT validation (Supabase tokens)
- Service role key stays on server only
- Supabase Auth (email/password)
- Row Level Security (RLS) on all tables
- Role-based protected routes in React
- Multi-SACCO data isolation for admin/driver/owner

## Troubleshooting

### Registration fails

Make sure the **backend is running** (`cd backend && npm run dev`). Registration now uses the API and does not send emails.

### "Email rate limit exceeded" (legacy)

Supabase free tier limits how many auth emails can be sent per hour. **Stop clicking Register** — each attempt makes it worse.

**Fix 1 — Dashboard (fastest, no email sent):**

1. [Supabase Dashboard](https://supabase.com/dashboard/project/wbvzyxkacxthxmcdmtoe/auth/users) → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter email + password
4. Turn **ON** → **Auto Confirm User**
5. Click **Create user**
6. Log in at http://localhost:5173/login

Also turn **OFF** “Confirm email”: **Authentication** → **Providers** → **Email** → save.

**Fix 2 — Terminal script (creates user + wallet, no email):**

1. Add your secret key to `frontend/.env` (Dashboard → Settings → API → secret key):
   ```
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   ```
2. Run:
   ```bash
   cd frontend
   npm run create-user -- passenger@test.com pass123 "Test Passenger" passenger
   ```
3. Log in with that email and password.

**Fix 3 — Wait:** the limit resets after about 1 hour.

## License

MIT
# smart-matatu

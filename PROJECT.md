# Smart Matatu — Full Project Documentation

**Smart Matatu Fare Collection and Vehicle Tracking System** is a full-stack web application for public transport (matatu) management in Nakuru, Kenya. It digitizes fare collection, provides real-time vehicle tracking, and gives SACCO administrators tools to manage operations across multiple transport operators.

---

## Table of Contents

1. [Overview](#overview)
2. [Problem & Solution](#problem--solution)
3. [User Roles](#user-roles)
4. [Features by Module](#features-by-module)
5. [Technology Stack](#technology-stack)
6. [System Architecture](#system-architecture)
7. [Project Structure](#project-structure)
8. [Database Design](#database-design)
9. [Payment System](#payment-system)
10. [GPS Tracking](#gps-tracking)
11. [API Reference](#api-reference)
12. [Frontend Routes](#frontend-routes)
13. [Environment Variables](#environment-variables)
14. [Installation & Setup](#installation--setup)
15. [Sample Nakuru Data](#sample-nakuru-data)
16. [Security](#security)
17. [Troubleshooting](#troubleshooting)
18. [Scripts Reference](#scripts-reference)
19. [License](#license)

---

## Overview

| Item | Detail |
|------|--------|
| **Project name** | Smart Matatu |
| **Focus area** | Nakuru County, Kenya |
| **Type** | Full-stack web application |
| **Users** | Passengers, Drivers, SACCO Admins, Vehicle Owners |
| **Payment** | Internal digital wallet (simulated — no M-Pesa/external APIs) |
| **Maps** | Leaflet + OpenStreetMap |
| **Language** | English with Kiswahili labels (e.g. Nauli, Mkoba, Safari) |

---

## Problem & Solution

### Problems addressed

- Cash fare handling is slow and hard to audit
- Passengers cannot track matatus they intend to board
- SACCOs lack centralized revenue and trip visibility
- Vehicle owners have limited insight into earnings per trip

### How Smart Matatu solves them

- **Digital wallet** for cashless fare payment before boarding
- **QR code + payment code** shown to driver for verification
- **Stage-to-stage fares** reflecting real matatu pricing
- **Live GPS** from driver devices during active trips
- **Admin dashboards** with charts for revenue and operations
- **Multi-SACCO** support with data isolation per operator

---

## User Roles

| Role | Kiswahili | Registration | Access scope |
|------|-----------|--------------|--------------|
| **Passenger** | Abiria | Self-register at `/register` | Own wallet, payments, trip history, track paid matatu |
| **Driver** | Dereva | Created by admin | Assigned vehicle/route, trips, payment verification |
| **Admin** | Msimamizi | Created by admin | Full SACCO management for their `sacco_id` |
| **Owner** | Mmiliki | Created by admin | Own vehicles, earnings, live tracking |

---

## Features by Module

### Passenger Module

- Register and login (via backend API — no email confirmation)
- View routes and stage-to-stage fares
- Top up wallet (self-simulated) or receive admin credit
- Pay fare before boarding — selects route, active matatu, from/to stages
- Receive **QR code** and **8-character payment code**
- Track **only the matatu they paid for** on a live map
- View wallet balance, transaction history, and trip history

### Driver Module

- Login and view assigned vehicle and route
- **Start trip** / **End trip**
- Automatic GPS updates every ~10 seconds while trip is active
- Verify passenger payment codes before boarding
- View route stages and fare table

### Admin Module (SACCO)

- Dashboard analytics (revenue, trips, vehicles, drivers)
- Manage staff users (driver, owner, admin)
- Manage vehicles and driver assignments
- CRUD routes, stages, and stage-to-stage fares
- Credit passenger wallets
- Monitor all trips for the SACCO
- Reports with bar charts, line charts, and pie charts

### Vehicle Owner Module

- View owned vehicles and status
- Monitor live vehicle location on map
- View earnings per verified payment (default **70% owner / 30% SACCO**)
- Trip utilization overview

---

## Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite | Build tool and dev server |
| React Router 7 | Client-side routing |
| Tailwind CSS 4 | Styling (Kenya-inspired green/red theme) |
| Axios | HTTP client for backend API |
| Leaflet + react-leaflet | Interactive maps (OpenStreetMap tiles) |
| Recharts | Admin analytics charts |
| qrcode.react | Payment QR codes |
| @supabase/supabase-js | Auth sessions and Realtime subscriptions |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express 5 | REST API server |
| @supabase/supabase-js | Supabase Admin + Auth client |
| pg | Direct PostgreSQL setup script |
| cors, dotenv | CORS and environment config |

### Database & Infrastructure

| Technology | Purpose |
|------------|---------|
| Supabase PostgreSQL | Primary database |
| Supabase Auth | Email/password authentication |
| Supabase Realtime | Live updates (trips, locations, payments, wallets) |
| Row Level Security (RLS) | Per-user and per-SACCO data access control |

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client["Browser (React)"]
        UI[Role-based Dashboards]
        Map[Leaflet Map]
        Auth[Supabase Auth Session]
    end

    subgraph API["Express Backend :5000"]
        AuthR[/auth/]
        PayR[/payments/]
        TripR[/trips/]
        AdminR[/admin/]
    end

    subgraph Supabase["Supabase Cloud"]
        PG[(PostgreSQL)]
        SA[Supabase Auth]
        RT[Realtime]
    end

    UI --> AuthR
    UI --> PayR
    UI --> TripR
    UI --> AdminR
    UI --> SA
    UI --> RT
    AuthR --> SA
    AuthR --> PG
    PayR --> PG
    TripR --> PG
    AdminR --> PG
    Map --> RT
```

### Request flow (typical)

1. User logs in → frontend calls `POST /api/auth/login`
2. Backend validates credentials via Supabase Auth
3. Backend ensures `profiles` + `wallets` rows exist
4. Session tokens stored in Supabase client; API calls include `Bearer` token
5. Protected operations use RLS-enforced RPC functions or admin client

---

## Project Structure

```
smart matatu/
├── backend/                    # Express REST API
│   ├── src/
│   │   ├── index.js            # Server entry point
│   │   ├── config/
│   │   │   └── supabase.js     # Admin + anon Supabase clients
│   │   ├── lib/
│   │   │   ├── checkDb.js      # Database health check
│   │   │   └── ensureProfile.js # Auto-create profile + wallet
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT auth + role guards
│   │   └── routes/
│   │       ├── auth.routes.js
│   │       ├── profile.routes.js
│   │       ├── wallets.routes.js
│   │       ├── payments.routes.js
│   │       ├── trips.routes.js
│   │       ├── routes.routes.js
│   │       ├── admin.routes.js
│   │       ├── driver.routes.js
│   │       └── owner.routes.js
│   ├── scripts/
│   │   ├── check-db.js         # npm run check:db
│   │   └── setup-db.js         # npm run setup:db
│   ├── .env.example
│   └── package.json
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── App.jsx             # Router + protected routes
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   ├── supabase.js     # Supabase browser client
│   │   │   └── api.js          # Axios API wrapper
│   │   ├── components/
│   │   │   ├── Layout.jsx      # Sidebar navigation
│   │   │   ├── MapView.jsx     # Leaflet map component
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── SetupRequired.jsx
│   │   └── pages/
│   │       ├── auth/           # Login, Register
│   │       ├── passenger/      # 6 pages
│   │       ├── driver/         # 4 pages
│   │       ├── admin/          # 7 pages
│   │       └── owner/          # 4 pages
│   ├── scripts/
│   │   └── create-user.js      # Dev user creation
│   ├── .env.example
│   └── package.json
│
└── supabase/                   # SQL migrations & seeds
    ├── setup-all.sql           # ⭐ One-file full setup
    ├── schema.sql              # Tables, functions, RLS
    ├── seed.sql                # Nakuru sample data
    ├── fix-missing-profiles.sql
    └── fix-payment-code.sql    # Partial schema repair
```

---

## Database Design

### Core tables

| Table | Description |
|-------|-------------|
| `saccos` | Transport operators (multi-SACCO) |
| `sacco_settings` | Per-SACCO config (owner earnings %) |
| `profiles` | User profiles linked to `auth.users` |
| `routes` | Matatu routes per SACCO |
| `route_stages` | Ordered stops on a route (with GPS coords) |
| `stage_fares` | Fare matrix: from_stage → to_stage |
| `vehicles` | Matatu fleet per SACCO |
| `driver_assignments` | Driver ↔ vehicle ↔ route mapping |
| `wallets` | Passenger digital wallet balances |
| `wallet_transactions` | Top-ups, payments, credits |
| `trips` | Active/completed driver trips |
| `vehicle_locations` | Latest GPS per vehicle |
| `payments` | Fare payments with unique `payment_code` |
| `owner_earnings` | Revenue split per verified payment |

### Entity relationships

```mermaid
erDiagram
    saccos ||--o{ routes : has
    saccos ||--o{ vehicles : owns
    routes ||--o{ route_stages : contains
    routes ||--o{ stage_fares : prices
    profiles ||--o| wallets : has
    profiles ||--o{ payments : makes
    vehicles ||--o{ trips : runs
    profiles ||--o{ trips : drives
    trips ||--o{ vehicle_locations : tracks
    payments ||--o| owner_earnings : generates
```

### Key PostgreSQL functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Trigger: auto-create profile + wallet on signup |
| `topup_wallet()` | Add funds to wallet (admin or self) |
| `create_payment()` | Deduct fare, generate payment code |
| `verify_payment()` | Driver verifies code; splits owner earnings |
| `start_trip()` | Begin active trip |
| `end_trip()` | Complete trip |
| `upsert_vehicle_location()` | Update vehicle GPS |

---

## Payment System

### Design principles

- **No external payment APIs** (M-Pesa, Stripe, etc.)
- Simulated wallet top-ups for demonstration
- All transactions recorded in `wallet_transactions`

### Pay-before-boarding flow

```mermaid
sequenceDiagram
    participant P as Passenger
    participant W as Wallet
    participant D as Driver
    participant O as Owner

    P->>W: Top up balance
    P->>P: Select route, matatu, stages
    P->>W: Pay fare (deducted immediately)
    P->>P: Show QR + payment code
    D->>D: Enter/scan payment code
    D->>D: verify_payment()
    Note over O: 70% owner / 30% SACCO
```

### Fare calculation

- **Stage-to-stage**: passenger picks `from_stage` and `to_stage`
- Fare read from `stage_fares` table
- Only forward stages allowed (lower `order_index` → higher)

### Payment states

| Status | Meaning |
|--------|---------|
| `pending` | Paid, awaiting driver verification |
| `verified` | Driver confirmed — passenger boarded |
| `expired` | Code expired (default 2 hours) |
| `cancelled` | Payment cancelled |

---

## GPS Tracking

| Setting | Value |
|---------|-------|
| Update interval | ~10 seconds |
| Trigger | Driver has active trip |
| Method | Browser `navigator.geolocation` |
| Storage | `vehicle_locations` table |
| Realtime | Supabase Realtime subscription |

### Map visibility rules

- **Passengers**: see only the matatu linked to their active payment
- **Owners**: see their own vehicles
- **Admins**: monitor via trip list (map per vehicle in owner/passenger views)

---

## API Reference

Base URL: `http://localhost:5000/api`

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | API status |
| GET | `/health/db` | No | Database table check |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register passenger (no email sent) |
| POST | `/auth/login` | No | Login, returns session + profile |
| POST | `/auth/logout` | No | Logout acknowledgment |

**Register body:**
```json
{
  "email": "passenger@test.com",
  "password": "pass123",
  "full_name": "John Doe"
}
```

### Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile/me` | Yes | Get/create profile |
| POST | `/profile/repair` | Yes | Force-create missing profile |

### Wallets

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/wallets/me` | Yes | Any | Wallet balance |
| GET | `/wallets/transactions` | Yes | Any | Transaction history |
| POST | `/wallets/topup` | Yes | passenger | Self top-up |
| POST | `/wallets/admin/credit` | Yes | admin | Credit passenger wallet |
| GET | `/wallets/admin/passengers` | Yes | admin | All passenger balances |

### Payments

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/payments` | Yes | Any | Payment history |
| POST | `/payments` | Yes | passenger | Create payment |
| POST | `/payments/verify` | Yes | driver | Verify payment code |

**Create payment body:**
```json
{
  "route_id": "uuid",
  "trip_id": "uuid",
  "vehicle_id": "uuid",
  "from_stage_id": "uuid",
  "to_stage_id": "uuid"
}
```

### Trips

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/trips` | Yes | Any | Trip list |
| GET | `/trips/active` | Yes | Any | Active trips (optional `?route_id=`) |
| POST | `/trips/start` | Yes | driver | Start trip |
| POST | `/trips/end` | Yes | driver | End trip |
| POST | `/trips/location` | Yes | driver | Update GPS |
| GET | `/trips/locations/:vehicleId` | Yes | Any | Latest vehicle location |

### Routes & Fares

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/routes` | Yes | Any | List routes |
| GET | `/routes/:id/stages` | Yes | Any | Route stages |
| GET | `/routes/:id/fares` | Yes | Any | Stage fares |
| POST | `/routes` | Yes | admin | Create route |
| POST | `/routes/:id/stages` | Yes | admin | Add stage |
| POST | `/routes/:id/fares` | Yes | admin | Add fare |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | admin | Staff list |
| POST | `/admin/users` | admin | Create staff user |
| GET | `/admin/vehicles` | admin | Vehicle list |
| POST | `/admin/vehicles` | admin | Add vehicle |
| POST | `/admin/assignments` | admin | Assign driver |
| GET | `/admin/analytics` | admin | Dashboard data |
| GET | `/admin/staff-options` | admin | Dropdown options |

### Driver

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/driver/assignment` | driver | Current assignment |
| GET | `/driver/active-trip` | driver | Active trip if any |

### Owner

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/owner/vehicles` | owner | Owned vehicles |
| GET | `/owner/earnings` | owner | Earnings history + total |

---

## Frontend Routes

| Path | Role | Page |
|------|------|------|
| `/login` | Public | Login |
| `/register` | Public | Passenger registration |
| `/passenger` | passenger | Dashboard |
| `/passenger/routes` | passenger | Routes & fares |
| `/passenger/pay` | passenger | Pay fare (QR code) |
| `/passenger/track` | passenger | Track paid matatu |
| `/passenger/wallet` | passenger | Wallet & top-up |
| `/passenger/history` | passenger | Trip history |
| `/driver` | driver | Dashboard |
| `/driver/trips` | driver | Start/end trip + GPS |
| `/driver/verify` | driver | Verify payment |
| `/driver/routes` | driver | Assigned route info |
| `/admin` | admin | Analytics dashboard |
| `/admin/users` | admin | Manage staff |
| `/admin/vehicles` | admin | Vehicles & assignments |
| `/admin/routes` | admin | Routes, stages, fares |
| `/admin/wallets` | admin | Credit wallets |
| `/admin/trips` | admin | Trip monitor |
| `/admin/reports` | admin | Reports & charts |
| `/owner` | owner | Dashboard |
| `/owner/vehicles` | owner | My vehicles |
| `/owner/earnings` | owner | Revenue share |
| `/owner/track` | owner | Live vehicle map |

---

## Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_API_URL=http://localhost:5000/api
```

### Backend (`backend/.env`)

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:PASSWORD@db.your-project.supabase.co:5432/postgres
```

> **Never** put `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in the frontend.

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm
- Supabase account and project

### Step 1 — Database

**Option A — SQL Editor (recommended first time):**

1. Open Supabase → **SQL Editor**
2. Copy all of `supabase/setup-all.sql` → **Run**

**Option B — Terminal:**

```bash
cd backend
# Add DATABASE_URL to .env with your DB password
npm run setup:db
```

**If you get `payment_code does not exist` error:**

Run `supabase/fix-payment-code.sql` in SQL Editor.

**Verify:**

```bash
cd backend
npm run check:db
```

### Step 2 — Supabase settings

1. **Authentication → Providers → Email** — enable Email
2. Turn **OFF** "Confirm email" (dev)
3. **Database → Replication** — enable Realtime for:
   - `trips`
   - `vehicle_locations`
   - `payments`
   - `wallets`

### Step 3 — Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase keys
npm install
npm run dev
```

Runs at http://localhost:5000

### Step 4 — Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env
npm install
npm run dev
```

Runs at http://localhost:5173

### Step 5 — Create first admin

After registering a passenger, promote via SQL:

```sql
UPDATE profiles
SET role = 'admin',
    sacco_id = 'a0000000-0000-0000-0000-000000000001'
WHERE email = 'your@email.com';
```

Or use Admin UI once an admin exists.

### Step 6 — Demo flow

1. Admin credits passenger wallet
2. Driver starts trip on assigned route
3. Passenger pays fare → gets QR code
4. Driver verifies payment code
5. Passenger tracks matatu on map

---

## Sample Nakuru Data

### SACCOs (from `seed.sql`)

| SACCO | ID |
|-------|-----|
| Nakuru Express SACCO | `a0000000-0000-0000-0000-000000000001` |
| Rift Valley Travellers | `a0000000-0000-0000-0000-000000000002` |

### Routes

| Route | Stages | Fare range (KES) |
|-------|--------|------------------|
| CBD → Lanet | CBD, Kiamunyi, Lanet | 30–50 |
| CBD → Njoro | CBD, Ngata, Njoro | 40–80 |
| CBD → Naivasha | CBD, Mbaruk, Naivasha Stage | 50–150 |
| CBD → Bahati | CBD, Bahati | 60 |
| CBD → Gilgil | CBD, Gilgil | 100 |

---

## Security

| Layer | Implementation |
|-------|----------------|
| Authentication | Supabase Auth (email/password, JWT) |
| API authorization | Bearer token validation + role middleware |
| Database | Row Level Security on all tables |
| Multi-tenancy | `sacco_id` scoping for admin/driver/owner |
| Secrets | Service role key server-side only |
| Frontend | Protected routes per role |
| Payments | Unique codes, expiry, driver verification required |

### RLS summary

- Passengers see only their own wallet, payments, and transactions
- Drivers see assigned resources and can verify payments
- Admins see data scoped to their SACCO (+ all passengers for wallet credit)
- Owners see only their vehicles and earnings

---

## Troubleshooting

### "Database setup required" screen

**Cause:** Profile row missing for logged-in user.

**Fix:**
1. Run `supabase/fix-payment-code.sql` or `fix-missing-profiles.sql`
2. Ensure backend is running
3. Click **"I ran the SQL — Check again"**

### `column "payment_code" does not exist`

**Cause:** Partial database setup — old `payments` table without all columns.

**Fix:** Run `supabase/fix-payment-code.sql`

### Registration fails / 400 error

- Ensure backend is running on port 5000
- Check `VITE_API_URL` in frontend `.env`
- Try a new email if address already registered

### Email rate limit exceeded

Registration now uses the backend API (no emails). If you still see this on old flows, use:
- `POST /api/auth/register` via the app, or
- `npm run create-user` in frontend

### Map not showing vehicle

- Driver must have **active trip**
- Browser must allow **location permission**
- Enable Realtime on `vehicle_locations` table

### `npm run check:db` fails

Run `supabase/setup-all.sql` or `npm run setup:db`

---

## Scripts Reference

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API (production) |
| `npm run check:db` | Verify all tables exist |
| `npm run setup:db` | Run setup-all.sql via PostgreSQL |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run create-user` | Create user via service role (dev) |

### SQL files

| File | When to use |
|------|-------------|
| `setup-all.sql` | First-time full setup |
| `schema.sql` | Schema only |
| `seed.sql` | Sample data only |
| `fix-missing-profiles.sql` | Auth users without profiles |
| `fix-payment-code.sql` | Partial payments table repair |

---

## License

MIT

---

## Quick Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [React Documentation](https://react.dev)
- [Leaflet Documentation](https://leafletjs.com)
- [Express Documentation](https://expressjs.com)

---

*Smart Matatu — Digitizing public transport in Nakuru, Kenya.*

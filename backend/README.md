# Doctor Tracker — Backend API

> Secure REST API for the Doctor Tracker admin portal: JWT authentication, doctor & patient management with search / filter / pagination, and server-side analytics aggregations — built with **Node.js, Express and MongoDB (Mongoose)**.

This is the standalone backend half of a two-repo project. The frontend lives in its own repository ([`doctor-tracker-frontend`](../frontend)) and consumes this API over REST.

---

## Table of Contents

1. [Description](#description)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Setup Guide](#setup-guide)
5. [System Architecture](#system-architecture)
6. [API Reference](#api-reference)
7. [Technical Decisions](#technical-decisions)
8. [Query Performance & Indexing](#query-performance--indexing)
9. [Project Structure](#project-structure)
10. [Deployment](#deployment)

---

## Description

Doctor Tracker's backend is a focused Express service that exposes a small, well-validated REST surface: one login endpoint, CRUD + query endpoints for doctors and patients, and three aggregation endpoints that power the admin dashboard's charts. Every data-heavy operation (searching, filtering, pagination, counting, analytics) is executed inside MongoDB rather than in Node, so the API stays fast as collections grow. Authentication is a single admin account issued as a JWT; every route below `/api/auth/login` is guarded by middleware, and the login endpoint itself is rate-limited against brute-force attempts.

## Features

- **Authentication** — bcrypt-hashed credentials, JWT bearer tokens, rate-limited login, `GET /api/auth/me` session check.
- **Doctor management** — create / list / search / filter (specialization, hospital, status, date-range) / paginate / update / delete with cascade patient removal; per-doctor patient sub-list.
- **Patient management** — create / list / search / filter (condition, status, assigned doctor, date-range) / paginate / update / delete, with populated doctor references.
- **Analytics** — totals, patients-per-doctor (top N), specialization distribution, per-day registration trends, condition distribution — all via MongoDB aggregation pipelines.
- **Hardening** — Helmet security headers, CORS allow-list, 100 KB body cap, compression, centralized error handler that maps Mongoose errors to clean 400/409 responses, graceful shutdown.
- **Seed script** — deterministic demo dataset (1 admin, 24 doctors, ~175 patients) with credentials configurable through env vars.

## Tech Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Runtime | Node.js ≥ 18 | LTS, matches Render/Vercel runtimes |
| Framework | Express 4 | Minimal, explicit middleware pipeline |
| Database | MongoDB + Mongoose 8 | Spec requirement; schemas give declarative validation + index management |
| Auth | jsonwebtoken + bcryptjs | Stateless sessions; hashes never leave the server |
| Validation | express-validator | Route-level input whitelist before anything touches Mongo |
| Security | helmet, cors, express-rate-limit, compression | Standard production hardening |

## Setup Guide

### Prerequisites

- Node.js ≥ 18.17
- MongoDB — either a local `mongod` or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Steps

```bash
# 1. Clone and install
git clone <your-backend-repo-url> doctor-tracker-backend
cd doctor-tracker-backend
npm install

# 2. Configure environment
cp .env.example .env
#    edit .env:
#    - MONGODB_URI   -> your local or Atlas connection string
#    - JWT_SECRET    -> generate one:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Seed demo data (admin + 24 doctors + ~175 patients)
npm run seed

# 4. Start the dev server
npm run dev        # http://localhost:5000

# 5. Verify
curl http://localhost:5000/api/health
# -> {"success":true,"message":"Doctor Tracker API is healthy.", ...}
```

Default seeded credentials (override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`):

```
email:    admin@doctortracker.com
password: Admin@123
```

### Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | yes | HTTP port (Render injects this automatically) |
| `MONGODB_URI` | yes | Mongo connection string (local or Atlas) |
| `JWT_SECRET` | yes | ≥ 32 chars; signing key for tokens |
| `JWT_EXPIRES_IN` | yes | Token lifetime, e.g. `1d` |
| `CORS_ORIGIN` | yes | Comma-separated list of allowed frontend origins |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | no | Override the seeded admin account |

## System Architecture

```
┌────────────────────────┐        REST (JSON over HTTPS)        ┌──────────────────────────┐
│  Next.js Frontend      │  ──────────────────────────────────► │  Express API (this repo) │
│  (separate repo)       │        Authorization: Bearer <JWT>   │                          │
│                        │                                       │  middleware chain:       │
│  • AuthProvider        │                                       │  cors → helmet →        │
│  • useApi data hooks   │                                       │  compression → json →   │
│  • Recharts dashboard  │                                       │  routes → errorHandler  │
└────────────────────────┘                                       │            │             │
                                                                 │            ▼             │
                                                                 │  Mongoose ODM            │
                                                                 └────────────┬─────────────┘
                                                                              │
                                                              ┌───────────────▼──────────────┐
                                                              │  MongoDB (Atlas / local)     │
                                                              │  admins · doctors · patients │
                                                              │  indexed for search/filter   │
                                                              └──────────────────────────────┘
```

Request lifecycle for a typical list call:

1. The frontend calls `GET /api/doctors?search=cardio&page=2&limit=10` with the stored JWT.
2. `auth.protect` verifies the JWT and loads the admin (a single indexed `findById`).
3. The route builds a **whitelisted** filter object from the query (never raw `req.query`), clamps pagination, and runs `countDocuments` + `find().skip().limit().lean()` **in parallel**.
4. Mongo answers using the compound/text indexes described below.
5. The response is wrapped in the standard envelope `{ success, data, meta }`; any thrown error funnels into the central error handler and comes back as a structured `{ success: false, message, fieldErrors? }`.

Data model:

```
Admin   (email unique, passwordHash, role)
Doctor  (name, specialization, hospital, phone, email unique, consultationFee, status)
Patient (name, age, gender, condition, doctor → Doctor._id, phone, email, status, admittedAt, notes)
```

A patient references exactly one doctor (1:N), so "patients of doctor X" is one indexed query and deleting a doctor cascades via `Patient.deleteMany({ doctor })`.

## API Reference

Base URL: `/api` — all endpoints except `login` require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Issue JWT (rate-limited, 20 / 15 min / IP) |
| GET | `/api/auth/me` | Current admin profile |
| GET | `/api/doctors` | List — `search, specialization, hospital, status, createdFrom, createdTo, sort, page, limit` |
| GET | `/api/doctors/meta` | Distinct specializations + hospitals for filter dropdowns |
| GET | `/api/doctors/:id` | Single doctor |
| POST | `/api/doctors` | Create (validated body) |
| PUT | `/api/doctors/:id` | Update |
| DELETE | `/api/doctors/:id` | Delete + cascade patients |
| GET | `/api/doctors/:id/patients` | Paginated patients of one doctor (`search`, `condition`, `status`) |
| GET | `/api/patients` | List — `search, condition, status, doctor, createdFrom, createdTo, sort, page, limit` |
| GET | `/api/patients/meta` | Conditions, statuses, doctor options |
| GET | `/api/patients/:id` | Single patient (populated doctor) |
| POST | `/api/patients` | Create |
| PUT | `/api/patients/:id` | Edit |
| DELETE | `/api/patients/:id` | Delete |
| GET | `/api/analytics/overview` | Totals, bySpecialization, patientsPerDoctor (top 10) |
| GET | `/api/analytics/daily?days=14` | Continuous per-day registration series |
| GET | `/api/analytics/conditions` | Condition distribution |
| GET | `/api/health` | Liveness probe (no auth) |

List responses always include pagination metadata:

```json
{
  "success": true,
  "data": [ /* page of documents */ ],
  "meta": { "page": 2, "limit": 10, "total": 24, "totalPages": 3 }
}
```

## Technical Decisions

### Decision 1 — Two-query pagination instead of `$facet` (and why the count is separate)

The dashboard and both list pages need `total` for every page (page count, "showing 1–10 of 175"). MongoDB offers two ways to get documents + count in one round trip: `$facet` in an aggregation, or two plain operations.

I chose **`Promise.all([countDocuments(filter), find(filter).skip().limit().lean()])`**. Reasons:

- **Count accuracy across `$facet`:** `$facet` has a 100 MB per-stage memory limit and its count branch executes on the same pipeline as the data branch; with a `$match` up front both branches re-scan the same input, so you pay the filter cost twice inside one command.
- **Index utilization:** a plain `find` with `.sort().skip().limit()` is covered end-to-end by the compound indexes (see below); the planner can walk the index, skip 10 entries and stop — it never materializes the full result set. `$facet` stages are harder for the planner to reason about and typically fall back to a collection scan + in-memory merge.
- **Failure isolation:** the count and the page stay independent promises; a slow count can't force the documents query to hold a cursor open.

The trade-off is one extra round trip per page load (a ~1 ms indexed `countDocuments`), which is negligible next to the safety and planner-friendliness it buys.

### Decision 2 — JWT in `Authorization` header (not cookies), stored in `localStorage`

The task explicitly asks for a *separate* standalone API and a *separate* frontend deployment — different origins by construction. That drove the choice:

- **Cookies would force CSRF machinery for zero benefit here.** A cross-origin cookie setup (Render API + Vercel app) means `SameSite=None; Secure`, credentials-mode fetches, preflights on every call, and CSRF tokens to compensate. With a header-attached bearer token there is no ambient authority: another origin's page cannot make the browser attach our token, so the CSRF class of attacks is structurally absent.
- **Stateless horizontal scaling.** Render's free tier sleeps and cold-starts; any server-side session store would add a second network hop (and a second service) to every request. A signed JWT lets any instance validate the token locally.
- **Client ergonomics.** One `getToken()` call in the shared fetch wrapper handles every request; expiry is a single 401 branch that clears the token and routes to `/login`.

XSS is the honest trade-off: a script injection could read `localStorage`. Mitigations in this codebase: no `dangerouslySetInnerHTML` anywhere, all API responses rendered as text by React, a strict CSP-adjacent header set via Helmet, a 100 KB JSON body cap, and regex-escaped search inputs server-side. For this admin portal (single tenant, no third-party scripts) that risk profile is acceptable; a public multi-tenant app would move to `httpOnly` cookies with a refresh-token rotation.

## Query Performance & Indexing

All indexes are declared in the Mongoose schemas (created automatically at boot):

```js
// Doctor
doctors.createIndexes:
  { name: 'text', specialization: 'text', hospital: 'text' }   // search box
  { specialization: 1, createdAt: -1 }                          // filter + newest-first
  { hospital: 1,       createdAt: -1 }
  { status: 1,         createdAt: -1 }
  { createdAt: -1 }                                             // default listing
  { email: 1 }  (unique)

// Patient
  { name: 'text', condition: 'text', notes: 'text' }
  { doctor: 1,     createdAt: -1 }                              // per-doctor list
  { condition: 1,  createdAt: -1 }
  { status: 1,     createdAt: -1 }
  { createdAt: -1 }
```

Additional query-level optimizations:

- **`lean()`** on every read path — skips hydrating full Mongoose documents (≈ 2–5× less allocation per row).
- **Server-clamped pagination** — `limit` is capped at 100 and `skip` is derived from `page`, so a client can never request an unbounded cursor.
- **Search inputs are regex-escaped** and anchored `i` — no ReDoS or pattern-injection from the search box.
- **Aggregations stay in Mongo** — the dashboard's `patientsPerDoctor` uses `$lookup + $size`, not N+1 counts; `daily` groups by `$dateToString` and the *server* fills the date gaps so the client renders a continuous series with zero post-processing.
- **Filter dropdowns via `distinct()`** — one tiny covered query per dropdown instead of shipping the collection to the client.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # mongoose connection + graceful close
│   │   └── env.js                # fail-fast env validation
│   ├── middleware/
│   │   ├── auth.js               # JWT guard (protect)
│   │   ├── asyncHandler.js       # try/catch wrapper for async routes
│   │   └── errorHandler.js       # central error mapper (400/401/404/409/500)
│   ├── models/
│   │   ├── Admin.js              # bcrypt passwordHash, toJSON strips hash
│   │   ├── Doctor.js             # schema + index declarations
│   │   └── Patient.js            # schema + index declarations
│   ├── routes/
│   │   ├── auth.routes.js        # login (rate-limited), me
│   │   ├── doctor.routes.js      # CRUD + query + nested patients
│   │   ├── patient.routes.js     # CRUD + query
│   │   └── analytics.routes.js   # overview / daily / conditions
│   ├── utils/
│   │   ├── pagination.js         # page/limit parsing + clamping
│   │   └── sendResponse.js       # { success, data, meta } envelope
│   ├── app.js                    # express assembly (helmet, cors, routes)
│   ├── server.js                 # listener + graceful shutdown
│   └── seed.js                   # deterministic demo data
├── scripts/
│   └── verify-backend.js         # 37-check API smoke suite (in-memory Mongo)
├── .env.example
└── package.json
```

## Deployment

### Render (Free Tier)

1. Push this repo to GitHub.
2. Render → **New → Web Service** → connect the repo.
3. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Environment:** `MONGODB_URI` (Atlas SRV string), `JWT_SECRET`, `JWT_EXPIRES_IN=1d`, `CORS_ORIGIN=https://<your-frontend>.vercel.app`, `NODE_ENV=production`
4. First deploy: run `npm run seed` once from the Render shell (or seed against Atlas from your machine) to create the admin account.
5. Health check path: `/api/health`.

> Free-tier note: Render spins the service down after 15 idle minutes; the first request after that pays a ~30 s cold start. The frontend surfaces a friendly "Cannot reach the API" message while it wakes.

---

### Verification

```bash
node scripts/verify-backend.js
# ===== RESULT: 37 passed, 0 failed =====
```

The suite boots an in-memory MongoDB, seeds it, and exercises auth (401s, bad credentials, login), every doctor/patient query combination (search, each filter, date ranges, pagination edges, sort), CRUD, cascade delete, all three analytics endpoints, and the error paths (duplicate email → 409, invalid payload → 400 with field errors, malformed ObjectId → 400, unknown id → 404).

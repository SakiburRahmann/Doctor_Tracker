# Doctor Tracker

## Description

Doctor Tracker is a secure administrative portal for a multi-doctor practice: an
authenticated admin manages a registry of doctors and the patients assigned to each of
them, and watches the practice at a glance on an analytics dashboard. A **Next.js 15**
frontend talks to a **standalone Express + MongoDB** REST API — JWT authentication over
every route, server-side search/filter/sort/pagination driven by compound database
indexes, and a dashboard whose numbers are computed by MongoDB aggregation pipelines
rather than in the browser. It is built for the moment a registry stops being a list of
24 rows and becomes tens of thousands.

> Live: frontend <https://doctor-tracker-virid.vercel.app> · API
> <https://doctor-tracker-api-gamma.vercel.app> · Demo login
> `admin@doctortracker.com` / `Admin@123`

---

## Setup guide

### 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js ≥ 18.17 | Both packages declare `engines` |
| MongoDB | Local `mongod` for development, or a free **MongoDB Atlas M0** cluster |
| npm | Lockfiles are committed; use `npm ci` for reproducible installs |

### 2. Environment files

Both apps ship a committed template. Copy and fill them — **never commit the real ones**
(`.env`, `.env.local` are git-ignored).

```bash
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env.example`

| Variable | Example | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/doctor_tracker` | Database connection |
| `JWT_SECRET` | 32+ random characters | Token signing key (the app refuses placeholders in production) |
| `JWT_EXPIRES_IN` | `1d` | Session lifetime |
| `CORS_ORIGIN` | `http://localhost:3000` | The single allowed browser origin |
| `NODE_ENV` | `development` | Enables the production guards |
| `PORT` | `5000` | API port |

`frontend/.env.example`

| Variable | Example | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` | Origin the `/api/*` proxy forwards to (next.config rewrite) |

### 3. Run it

```bash
# API — http://localhost:5000
cd backend
npm ci
npm run seed        # admin account + 24 doctors / ~175 patients of demo data
npm run dev         # node --watch

# Web app — http://localhost:3000
cd ../frontend
npm ci
npm run dev
```

Sign in with the seeded account: **admin@doctortracker.com / Admin@123**.

Useful scripts: `npm run seed:destroy` (wipe the seeded data), `npm run db:indexes`
(build/reconcile the Mongo indexes and print them), `npm run build` (frontend production
build), `npm start` (backend production start).

### 4. Deploy

Two Vercel projects from this one repo — see [Deployment](#deployment).

---

## System architecture

```
┌──────────────────────────────┐        HTTPS / JSON + JWT        ┌───────────────────────────┐
│  Next.js 15 (App Router)     │ ───────────────────────────────▶ │  Express 4 REST API       │
│  React 18 · Tailwind         │ ◀─────────────────────────────── │  helmet · cors · rate     │
│  client components only      │      { success, data, meta }      │  limit · validators       │
│                              │                                   │                           │
│  /login    → JWT to storage  │                                   │  /api/auth                │
│  /dashboard → 1 fetch        │                                   │  /api/doctors             │
│  /doctors   → list + filters │                                   │  /api/patients            │
│  /doctors/:id → profile+list │                                   │  /api/analytics           │
│  /patients  → list + filters │                                   │                           │
└──────────────────────────────┘                                   └────────────┬──────────────┘
        ▲                                                                      │ Mongoose
        │  Bearer token on every request                                       ▼
        │                                                          ┌───────────────────────────┐
   localStorage['dt_token']                                        │  MongoDB                  │
                                                                   │  admins · doctors ·       │
                                                                   │  patients (1:N)           │
                                                                   │  compound + text indexes  │
                                                                   └───────────────────────────┘
```

**Request lifecycle.** A page renders, `useApi` issues one `fetch` with
`Authorization: Bearer <jwt>`; Express runs `protect` (verify JWT → resolve the admin from
an in-process cache), then the route handler validates input with `express-validator`,
builds a **whitelisted** Mongo filter, and issues the count and the page together. The
reply is always `{ success, data, meta }`, so list pages get their pagination envelope
from the same response as their rows. Mutations return the created/updated document and
drop the server cache; the client refetches the affected query instead of guessing the
new state.

**Why two apps instead of Next API routes.** The brief requires a standalone Express
server and a separate client. Splitting them also keeps the token boundary honest: the
browser only ever holds a JWT, never a database credential, and the API can be scaled,
rate-limited and deployed independently (it runs as a single Vercel serverless function).

**Dashboard data flow.** `/dashboard` makes **one** request. `analytics/dashboard` returns
totals, specialization mix, status mix, busiest doctors, condition mix, the twelve-month
series, the filter options *and* the current page of the doctor list. Filter changes reuse
the same endpoint: the aggregates are memoised server-side, so only the list query runs.
Selecting a doctor adds `doctors/:id/stats` for that panel. Every number is computed by
MongoDB; the browser never receives a collection to count.

**Why the dashboard is one request.** It used to fan out to five analytics endpoints plus
the list. On a serverless host each of those is its own cold-start candidate, its own TLS
round trip and its own database connection, so the numbers arrived in a sum of latencies
rather than a single one. One endpoint that batches the aggregates into two `$facet`
pipelines and reuses the shared list service costs one round trip, one cold start and one
cache entry.

---

## Project structure

```
backend/src
├── app.js · server.js     Express assembly, listener, graceful shutdown
├── config/                env validation · cached Mongo connection
├── models/                Admin · Doctor · Patient (schema + indexes)
├── routes/                auth · doctors · patients · analytics — HTTP layer only
├── services/              doctorList · patientList · search — all query logic
├── middleware/            auth · validate · errorHandler · asyncHandler
├── utils/                 envelope · pagination · ids · listQuery · cache
└── scripts/               syncIndexes

frontend
├── app/                   login · dashboard · doctors · doctors/[id] · patients
├── components/            AppShell, Avatar, charts, modals, ui primitives
└── lib/                   api client · useApi · auth/theme context · snapshot · portraits
```

A route file may only do four things: whitelist input, call a service, set cache headers
and return the `{ success, data, meta }` envelope. Anything that touches Mongo lives in
`services/`, which is why the dashboard, the doctors page and the doctor detail view all
behave identically.

---

## Technical decisions

### 1. Filtering, sorting and pagination belong to the server, not the table

The tempting shortcut for a 24-row demo is to fetch every doctor once and filter with
`Array.filter` in the browser. It reads well and it is wrong the moment the register
grows: the payload grows with the collection, `total` becomes "however many the client
happened to load", and the dashboard silently stops finding doctors after row 100.

Instead the query contract is explicit and lives in one place per resource
(`buildDoctorFilter`, `buildPatientFilter`): a **whitelist** of query parameters
(`search`, `specialization`, `hospital`, `status`, `createdFrom`, `createdTo`, `sort`,
`page`, `limit`), a shared `parsePagination` that clamps `limit` to 1–100, and the count
and the page issued **together** — one round trip, with each page row resolving its
patient total through an index-backed `$lookup` rather than a second grouped query. An
unfiltered count uses `estimatedDocumentCount`, which reads collection metadata instead
of scanning. Search terms are regex-escaped, so user input is never a pattern gadget.

Each filter combination the UI offers is backed by a compound index that puts the filter
field first and `createdAt` second (`{ specialization: 1, createdAt: -1 }`,
`{ status: 1, createdAt: -1 }`, `{ doctor: 1, createdAt: -1 }`, …), so the sort is served
by the index rather than a blocking in-memory `SORT`. The dashboard therefore asks
`/api/doctors?search=…&specialization=…&status=…&sort=…&limit=50` and reports
`meta.total` — the same numbers the list page shows.

**Cost:** the UI cannot instant-flip between filters without a round trip; the search box
is debounced (350 ms) and results are not optimistically filtered, which is the right
trade for a registry that has to stay correct.

### 2. URL as the state store, plus a 40-line `useApi` hook — no Redux, no React Query

List state (page, limit, search, every filter, sort) is *already* a shareable description
of what the user is looking at, so it is stored where it belongs: the URL. `/doctors?specialization=Cardiology&page=2`
survives a refresh, is restored by the back button, and can be pasted into a chat. A
`setParam` helper writes the patch and drops `page` whenever a filter changes, which
removes a whole class of "page 3 of 1 result" bugs.

Data fetching is a single hook (`lib/useApi.js`) built on `useState` + `useEffect`:

* the dependency key is `JSON.stringify(params)`, so a request fires only when the query
  actually changes — no request per render, no re-render loop;
* every new request aborts the previous one with `AbortController`, so a slow response
  can never overwrite a newer one (the classic out-of-order search bug);
* it returns `{ data, meta, loading, error, refetch }`, and `refetch` is stable, which is
  what the modals call after a mutation.

Redux would add a store, actions and selectors for state that is already addressable in
the URL; React Query would add a cache with staleness policies for screens whose data is
edited by the same user who is looking at it. Neither earns its weight here.

**Cost:** no cross-page cache — navigating from `/doctors` to `/doctors/:id` refetches the
doctor. That is one small indexed request, and it guarantees the detail view never shows a
stale record after an edit. `useApi` also does not retry; failures surface through the
shared `ErrorState` with an explicit "Try again", which is deliberate for an admin tool
where a silent retry can mask a real outage.

### 3. Small supporting decisions

* **JWT in `localStorage`** (not a cookie) because the browser talks to the API through a
  proxy while the session stays stateless; the trade-off is XSS exposure, mitigated by
  never rendering untrusted HTML. A CSP and httpOnly cookie session are the next
  hardening step.
* **Query logic lives in `backend/src/services/`** (`doctorList`, `patientList`, `search`),
  not in the route files: `/doctors`, `/doctors/:id/patients` and `/analytics/dashboard`
  all page, filter and search through one implementation, so their behaviour cannot drift.
* **One validation path** — `express-validator` rules (`utils/listQuery` for query
  strings, per-route body rules for writes) plus a single `middleware/validate` that turns
  failures into `{ field, message }[]`. Handlers contain no validation plumbing.
* **Model indexes are explicit** and reconciled by `npm run db:indexes`, rather than
  assuming a cold start built them.
* **`passwordHash` is `select: false`**, so it cannot leak through a generic `find()`.
* **Whitelisted updates** — `PUT /doctors/:id` copies named fields instead of spreading
  `req.body`, so a client can never write `_id`, timestamps or future schema fields.
* **Charts use Recharts**; the rest of the motion is `motion/react`. Both are client
  components only, so the initial HTML stays small.

---

## Features

**Authentication** — JWT login (rate-limited to 20 attempts / 15 min / IP), protected
routes on the client (`<Protected>`) and the server (`protect`), session resolved from the
signed token's claims with a 401 ending it from anywhere, sign-out, and an identical error
for unknown email and wrong password.

**Doctors** — create / edit / delete (cascading their patients), search by name,
specialization, hospital or email, filter by specialization, hospital, status and
registration date range, sort, paginate, view a doctor's patients, add a patient under a
doctor.

**Patients** — create / edit / delete, search by name or notes, filter by condition,
status, assigned doctor and registration range, sort (newest, oldest, name, age),
paginate.

**Dashboard** — totals (doctors, active, patients), average caseload, three compact
breakdowns (top specializations, patients by status, busiest doctors), "needs attention"
condition tiles that
deep-link into the filtered patient list, a searchable/filterable doctor block driven by
the API, and a switchable analytics panel: practice-wide twelve-month admissions chart
(patients **and** doctors) plus a condition-mix donut, or — once a doctor is selected —
that doctor's own six-month chart and condition totals.

**Cross-cutting** — light/dark themes with persisted preference, responsive from 360 px
up, keyboard-reachable controls, skeleton/empty/error states for every data surface, and
a desktop dashboard that fits the viewport without page scroll.

---

## API reference

All routes are under `/api` and require `Authorization: Bearer <token>` except `/auth/login`.
Responses are `{ success, message?, data?, meta? }`.

| Method | Route | Query / body |
| --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | — |
| GET | `/doctors` | `search, specialization, hospital, status, createdFrom, createdTo, sort, page, limit` |
| GET | `/doctors/meta` | distinct specializations + hospitals |
| GET | `/doctors/:id` | — |
| GET | `/doctors/:id/stats` | six-month admissions + condition/status mix |
| GET | `/doctors/:id/patients` | `search, condition, status, page, limit` |
| POST / PUT / DELETE | `/doctors`, `/doctors/:id` | doctor fields (validated) |
| GET | `/patients` | `search, condition, status, doctor, createdFrom, createdTo, sort, page, limit` |
| GET | `/patients/meta` | conditions, statuses, doctor options |
| GET | `/patients/:id` | — |
| POST / PUT / DELETE | `/patients`, `/patients/:id` | patient fields (validated) |
| GET | `/analytics/dashboard` | `months` (1–24) — the whole dashboard payload |
| GET | `/analytics/overview` | totals, by specialization, busiest doctors |
| GET | `/analytics/monthly` | `months` (1–24) — patients + doctors per month |
| GET | `/analytics/daily` | `days` (1–90) |
| GET | `/analytics/conditions` | condition distribution |

---

## Database & performance

* `doctors`: `{ specialization, createdAt }`, `{ hospital, createdAt }`, `{ status, createdAt }`,
  `{ createdAt }`, unique `email`, plus single-field **collation indexes** on `name`,
  `specialization` and `hospital`.
* `patients`: `{ doctor, createdAt }`, `{ doctor, condition }`, `{ condition, createdAt }`,
  `{ status, createdAt }`, `{ createdAt }`, plus collation indexes on `name` and `notes`.
* Indexes put the filter field first and the sort field second, so no list query pays for
  a blocking in-memory `SORT`.
* `npm run db:indexes` reconciles the declared indexes with the database and prints them
  (with their collation), instead of leaving index creation to a cold start.

**Search is index-backed.** A case-insensitive substring regex (`/amrul/i`) cannot use an
index — every keystroke would scan the collection. So search runs in two passes:

1. **Prefix pass.** The term is split into tokens and each token must prefix one of the
   searchable fields. The query runs under a `{ locale: 'en', strength: 2 }` collation,
   which is the one regex shape MongoDB can answer from a collation-matched index.
2. **Fallback pass.** Only when the prefix pass returns nothing does the original
   substring regex run, so a fragment from the middle of a surname still resolves.

The cost of the fallback is bounded by the empty result, and the result of both passes is
cached under the raw query values (never under the Mongo filter: `JSON.stringify` turns a
`RegExp` into `{}`, which would let two different searches share one cache entry).

**Latency work.** Server side first: every request was costing ~0.8–1.0 s, of which
~0.42 s is the network + serverless invoke floor (an unauthenticated `/api/health` probe
measures exactly that). The rest was avoidable work:

| Change | Effect |
| --- | --- |
| Admin lookup cached per token subject (was a DB query on **every** request) | one fewer round trip per call |
| Five dashboard analytics calls merged into `/analytics/dashboard` with two `$facet` pipelines | 6 requests → 2 |
| Caseload `$lookup` moved *after* the top-10 limit | joins 10 ids, not every patient into every doctor |
| Count + page issued together, `estimatedDocumentCount` when unfiltered | 4 round trips → 2 on the doctor list |
| 5-second TTL cache on reads, cleared on every write | repeat loads skip MongoDB entirely |
| CORS preflight cached 10 min (Chrome defaults to 5 s) | an `OPTIONS` round trip removed from almost every call |

Per-endpoint medians (7 runs each, deployed API):

| Endpoint | Before (p50) | After (p50) |
| --- | --- | --- |
| `/analytics/overview` | 0.858 s | 0.429 s |
| `/analytics/monthly` | 0.834 s | 0.418 s |
| `/analytics/conditions` | 0.823 s | 0.420 s |
| `/doctors/meta` | 0.807 s | 0.425 s |
| `/doctors?limit=50` | 1.015 s | 0.425 s |
| `/analytics/dashboard` (all of the above) | — | 0.412 s |

Client and transport second — the database was no longer the bottleneck, so the remaining
work was in how many times the page asked it anything:

| Change | Effect |
| --- | --- |
| Session read from the signed JWT instead of `GET /auth/me` before rendering | removes a blocking round trip from every page load |
| `/api/*` proxied on the frontend's own origin (next.config rewrite) | no CORS preflight, no second DNS/TCP/TLS handshake |
| Dashboard list served by the same request as its aggregates | first load: 3 requests → 1 |
| Last payload kept in localStorage, revalidated in the background | repeat visits paint before the network answers |
| Nav links warm the destination's first page on hover/focus | clicking a tab lands on data, not skeletons |

Page-level measurements (production, browser Navigation Timing):

| | Before | After |
| --- | --- | --- |
| JS download complete (DCL) | 543 ms | 110 ms (repeat visit) |
| Data requests start | 1232 ms | 295 ms |
| Requests per dashboard load | 3 (`auth/me` + 2 data) | 1 |
| Data on screen, first visit | ~1 994 ms | ~1 400 ms cold, ~450 ms warm |
| Data on screen, repeat visit | ~1 994 ms | ~110 ms (snapshot) |

The dashboard now pays one analytics round trip instead of five, and its single request
sits within ~10 ms of the empty-endpoint floor once the function is warm. What remains is
network distance: the functions and the Atlas cluster run in one region, so the floor for
a cold browser request from South Asia is ~0.45 s. Moving both deployments to a region
closer to the users is the only lever left, and it is an infrastructure decision rather
than a query one.

---

## Deployment

Deploy as **two Vercel projects** from this one repo:

| Project | Root directory | Env |
| --- | --- | --- |
| `doctor-tracker-api` | `backend/` | `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `NODE_ENV`, `PORT` |
| `doctor-tracker` | `frontend/` | `NEXT_PUBLIC_API_URL` (set before the first build) |

`backend/index.js` exports the Express app for Vercel's zero-config serverless build.
Seed the Atlas database once with `cd backend && MONGODB_URI=<atlas-uri> npm run seed`.

**CI/CD** — `.github/workflows/ci.yml` runs on every push to `main`: the backend job boots
a MongoDB 7 service container, seeds it, starts the API and asserts the auth chain (health
check, 401 without a token, seeded login, authenticated list); the frontend job runs a real
`next build` against the production API URL. Both Vercel projects are linked to `main`, so
a green push is a live deployment.

---

## Visual evidence

Screenshots are taken from the deployed build.

**Desktop — light theme**

Sign in:

![Sign in](frontend/docs/screenshots/v8-login.png)

Dashboard — metrics with three breakdowns, filter row, doctor list and the practice
analytics panel (twelve-month intake for patients *and* doctors, plus condition mix):

![Dashboard — light](frontend/docs/screenshots/v9-dashboard.png)

**Desktop — dark theme**

![Dashboard — dark](frontend/docs/screenshots/v7-dash-dark.png)

Selecting a doctor swaps the analytics panel for that doctor's own six-month admissions
chart, condition mix and contact strip:

![Doctor activity](frontend/docs/screenshots/v7-doctor-panel.png)

**Registries**

Doctor registry — search, filters, sort, pagination, inline edit/delete:

![Doctors](frontend/docs/screenshots/v4-doctors.png)

Patient registry — condition/status/doctor filters and date range:

![Patients](frontend/docs/screenshots/v4-patients.png)

**Mobile — 390 px**

The dashboard stacks: the metric card keeps its labelled breakdowns, then filters, list
and analytics.

![Dashboard — mobile](frontend/docs/screenshots/v10-mobile-dashboard.png)

The patient table drops to the columns that matter at this width (patient, condition,
actions) rather than scrolling sideways.

![Patients — mobile](frontend/docs/screenshots/v10-mobile-patients.png)

---

## Submission

| | |
| --- | --- |
| **Live application** | <https://doctor-tracker-virid.vercel.app> |
| **REST API** | <https://doctor-tracker-api-gamma.vercel.app> (`/api/health` for a liveness probe) |
| **GitHub repository** | <https://github.com/SakiburRahmann/Doctor_Tracker> |
| **Demo credentials** | `admin@doctortracker.com` / `Admin@123` |

There is one role (administrator) and one seeded account; the same credentials work on the
deployed app and on a local seed. No other access is required to review the project.

**Deploy roots** (both are Vercel projects on `main`): the API builds from `backend/`
(`index.js` is the serverless entry), the client from `frontend/`.

---

© Sakibur Rahman
